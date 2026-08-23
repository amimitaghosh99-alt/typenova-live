import type { Theme } from '@/data/constants';
import { makeTheme } from '@/data/constants';

// Basic HSL interface
interface HSL { h: number; s: number; l: number; }
interface RGB { r: number; g: number; b: number; }

function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h, s, l };
}

// Map a hue to the closest tailwind color family in our rgbMap
export function getClosestAccent(hsl: HSL): string {
  const h = hsl.h * 360;
  if (hsl.s < 0.15 || hsl.l < 0.15 || hsl.l > 0.85) return 'zinc'; // Grayscale
  
  if (h >= 345 || h < 15) return 'rose';
  if (h >= 15 && h < 45) return 'orange';
  if (h >= 45 && h < 65) return 'amber';
  if (h >= 65 && h < 150) return 'emerald'; // broad green
  if (h >= 150 && h < 175) return 'teal';
  if (h >= 175 && h < 205) return 'cyan';
  if (h >= 205 && h < 235) return 'sky';
  if (h >= 235 && h < 265) return 'blue';
  if (h >= 265 && h < 295) return 'purple';
  if (h >= 295 && h < 345) return 'fuchsia';
  
  return 'cyan';
}

export const ACCENT_SWATCHES = [
  { id: 'auto', label: 'Auto Detect', color: 'rgb(34,211,238)', border: '#22d3ee' },
  { id: 'cyan', label: 'Cyan Glow', color: 'rgb(6,182,212)', border: '#06b6d4' },
  { id: 'fuchsia', label: 'Neon Pink', color: 'rgb(217,70,239)', border: '#d946ef' },
  { id: 'emerald', label: 'Matrix Lime', color: 'rgb(16,185,129)', border: '#10b981' },
  { id: 'amber', label: 'Sunset Gold', color: 'rgb(245,158,11)', border: '#f59e0b' },
  { id: 'purple', label: 'Deep Violet', color: 'rgb(168,85,247)', border: '#a855f7' },
  { id: 'rose', label: 'Crimson Rose', color: 'rgb(244,63,94)', border: '#f43f5e' },
  { id: 'sky', label: 'Nordic Ice', color: 'rgb(14,165,233)', border: '#0ea5e9' },
] as const;

export function extractThemeFromImage(dataUrl: string, customAccentOverride?: string): Promise<Theme> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas context'));

      // Scale down for faster processing
      const MAX_SIZE = 200;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_SIZE) {
          height = height * (MAX_SIZE / width);
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width = width * (MAX_SIZE / height);
          height = MAX_SIZE;
        }
      }

      canvas.width = Math.max(1, Math.floor(width));
      canvas.height = Math.max(1, Math.floor(height));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let bestScore = -1;
      let bestRgb: RGB = { r: 6, g: 182, b: 212 };
      let bestHsl: HSL = { h: 0.5, s: 0.8, l: 0.5 };

      // Sample pixels with vibrant color filtration (skip muddy grays and washed out whites)
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const a = data[i+3];
        if (a < 128) continue;

        const hsl = rgbToHsl(r, g, b);
        
        // Skip unsaturated colors (grays, whites, washed out haze) and extreme darks/lights
        if (hsl.s < 0.25 || hsl.l < 0.15 || hsl.l > 0.85) continue;

        // Reward rich saturation with balanced lightness
        const lightnessSweetspot = 1 - Math.abs(0.55 - hsl.l) * 2;
        const score = (hsl.s * 3.5) + (lightnessSweetspot * 1.5);

        if (score > bestScore) {
          bestScore = score;
          bestRgb = { r, g, b };
          bestHsl = hsl;
        }
      }

      // If no vibrant pixel met the threshold, fallback to default neon cyan
      if (bestScore <= 0) {
        bestRgb = { r: 6, g: 182, b: 212 };
        bestHsl = { h: 0.52, s: 0.9, l: 0.5 };
      }

      const autoAccent = getClosestAccent(bestHsl);
      const accent = (customAccentOverride && customAccentOverride !== 'auto') ? customAccentOverride : autoAccent;
      
      const glowPrimary = `${bestRgb.r},${bestRgb.g},${bestRgb.b}`;
      
      const customTheme = makeTheme(
        'wallpaper', 
        'bg-black/60', 
        `text-${accent}-300`, 
        accent, 
        undefined,
        glowPrimary
      );
      
      resolve(customTheme);
    };
    img.onerror = (err) => reject(err);
    img.src = dataUrl;
  });
}

/**
 * Downscale and compress high-resolution wallpapers (e.g. 4K/8K or 20MB files)
 * into a lightweight GPU-friendly texture (max 1920x1080 WebP/JPEG ~300KB)
 * to prevent GPU texture thrashing and backdrop-filter freezing.
 */
export function resizeAndOptimizeImage(file: File, maxDim = 1920, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read wallpaper file'));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) return reject(new Error('Empty image payload'));

      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image for optimization'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP if supported, otherwise JPEG fallback
        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData.startsWith('data:image/webp')) {
            resolve(webpData);
            return;
          }
        } catch {}

        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
