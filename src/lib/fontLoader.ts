/**
 * On-demand font loader for TypeNova.
 * Prevents blocking CSSOM construction on cold boots. Core UI fonts
 * (Geist, Space Grotesk, JetBrains Mono, Sora) are linked in index.html;
 * decorative and thematic fonts load asynchronously when selected.
 */

const LOADED_FONTS = new Set<string>([
  'JetBrains Mono',
  'Geist',
  'Space Grotesk',
  'Sora',
  'Courier New',
  'monospace',
  'sans-serif',
  'serif',
  'system-ui'
]);

export function loadFontOnDemand(fontName: string): void {
  if (typeof document === 'undefined') return;
  if (!fontName || LOADED_FONTS.has(fontName)) return;

  const fontId = `dyn-font-${fontName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  if (document.getElementById(fontId)) {
    LOADED_FONTS.add(fontName);
    return;
  }

  const link = document.createElement('link');
  link.id = fontId;
  link.rel = 'stylesheet';
  const apiFamily = fontName.trim().replace(/\s+/g, '+');
  link.href = `https://fonts.googleapis.com/css2?family=${apiFamily}:ital,wght@0,400;0,700;1,400&display=swap`;
  document.head.appendChild(link);
  LOADED_FONTS.add(fontName);
}
