// ─── THEMES ─────────────────────────────────────────────
export const rgbMap: Record<string, string> = {
  cyan: '34,211,238', emerald: '52,211,153', fuchsia: '217,70,239',
  orange: '251,146,60', zinc: '228,228,231', sky: '14,165,233',
  amber: '245,158,11', pink: '236,72,153', red: '239,68,68',
  yellow: '250,204,21', blue: '96,165,250', rose: '244,63,94',
  white: '255,255,255', purple: '168,85,247', indigo: '129,140,248',
  lime: '163,230,53', teal: '45,212,191', violet: '139,92,246'
};

export interface Theme {
  name: string;
  bg: string;
  text: string;
  vividText: string;
  accent: string;
  drop: string;
  border: string;
  borderHalf: string;
  solid: string;
  bgAlpha: string;
  bgHover: string;
  glow: string;
  auraHigh: string;
  auraMed: string;
  auraLow: string;
  toastGlow: string;
  glowPrimary: string;
  glowSecondary: string;
}

export const contrastMap: Record<string, string> = {
  cyan: '168,85,247',      // purple
  emerald: '163,230,53',   // lime green (pure matrix green)
  fuchsia: '236,72,153',   // pink
  orange: '244,63,94',     // rose
  zinc: '156,163,175',     // gray
  sky: '96,165,250',       // blue
  amber: '251,146,60',     // orange
  pink: '217,70,239',      // fuchsia
  red: '251,146,60',       // orange
  yellow: '239,68,68',     // red
  blue: '14,165,233',      // sky
  rose: '236,72,153',      // pink
  white: '148,163,184',    // slate
  purple: '236,72,153',    // pink
  indigo: '217,70,239',    // fuchsia
  lime: '217,70,239',      // fuchsia (watermelon)
  teal: '244,63,94',       // rose (miami)
  violet: '250,204,21'     // yellow (lakers)
};

export const makeTheme = (
  name: string, 
  bg: string, 
  text: string, 
  accent: string, 
  solidOverride?: string,
  glowPrimaryOverride?: string,
  glowSecondaryOverride?: string
): Theme => {
  const rgb = glowPrimaryOverride || rgbMap[accent] || '255,255,255';
  const rgbSecondary = glowSecondaryOverride || contrastMap[accent] || '128,128,128';
  return {
    name, bg, text, accent,
    vividText: `text-${accent}-400`,
    drop: `drop-shadow-[0_0_8px_rgba(${rgb},0.8)]`,
    border: `border-${accent}-500/30`,
    borderHalf: `border-${accent}-500/50`,
    solid: solidOverride || `bg-${accent}-500`,
    bgAlpha: `bg-${accent}-500/20`,
    bgHover: `hover:bg-${accent}-500/10`,
    glow: `shadow-[0_0_10px_rgba(${rgb},1)]`,
    auraHigh: `shadow-[0_0_120px_rgba(${rgb},0.6)]`,
    auraMed: `shadow-[0_0_60px_rgba(${rgb},0.3)]`,
    auraLow: `shadow-[0_0_20px_rgba(${rgb},0.1)]`,
    toastGlow: `shadow-[0_0_30px_rgba(${rgb},0.3)]`,
    glowPrimary: rgb,
    glowSecondary: rgbSecondary,
  };
};

export const THEMES: Record<string, Theme> = {
  starfield: {
    name: 'starfield',
    bg: 'bg-black',
    text: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300',
    vividText: 'text-cyan-300',
    accent: 'cyan',
    drop: 'drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]',
    border: 'border-cyan-500/30',
    borderHalf: 'border-cyan-500/50',
    solid: 'bg-gradient-to-r from-cyan-500 to-indigo-500',
    bgAlpha: 'bg-cyan-500/10',
    bgHover: 'hover:bg-cyan-500/20',
    glow: 'shadow-[0_0_25px_rgba(56,189,248,0.5)]',
    auraHigh: 'shadow-[0_0_120px_rgba(56,189,248,0.4)]',
    auraMed: 'shadow-[0_0_60px_rgba(56,189,248,0.3)]',
    auraLow: 'shadow-[0_0_20px_rgba(99,102,241,0.2)]',
    toastGlow: 'shadow-[0_0_30px_rgba(56,189,248,0.4)]',
    glowPrimary: '56, 189, 248',
    glowSecondary: '99, 102, 241'
  },
  matrix: makeTheme('matrix', 'bg-[#001100]', 'text-emerald-400', 'emerald', undefined, '52,211,153', '163,230,53'),
  cyberpunk: makeTheme('cyberpunk', 'bg-[#110011]', 'text-fuchsia-500', 'fuchsia', undefined, '217,70,239', '236,72,153'),
  sunset: makeTheme('sunset', 'bg-[#1a0a00]', 'text-orange-400', 'orange', undefined, '245,158,11', '244,63,94'),
  nord: makeTheme('nord', 'bg-[#1e222a]', 'text-sky-300', 'sky', undefined, '14,165,233', '96,165,250'),
  dracula: makeTheme('dracula', 'bg-[#1a0a1a]', 'text-purple-400', 'purple', undefined, '168,85,247', '217,70,239'),
  monochrome: makeTheme('monochrome', 'bg-[#0a0a0a]', 'text-zinc-200', 'zinc', undefined, '228,228,231', '156,163,175'),
};

export const THEME_KEYS = Object.keys(THEMES);
