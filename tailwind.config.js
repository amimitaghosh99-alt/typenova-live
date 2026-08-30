// Theme classes in src/data/constants.ts are built with template literals
// (e.g. `border-${accent}-500/30`), which Tailwind's static scanner cannot
// see. Generate the safelist from the actual THEMES data so new themes can
// never silently lose their styles.
// NOTE: the config is evaluated once per build/dev-server start — after
// adding or editing a theme, restart `npm run dev` to refresh the safelist.
const jiti = require('jiti')(__dirname);
const { THEMES } = jiti('./src/data/constants.ts');
const rawTokens = Object.values(THEMES)
  .flatMap(theme => Object.values(theme))
  .filter(v => typeof v === 'string')
  .flatMap(v => v.split(/\s+/))
  .filter(token => token.includes('-') || token.includes('['));

const themeSafelist = [...new Set([
  ...rawTokens,
  ...rawTokens.filter(t => t.startsWith('border-') || t.startsWith('bg-')).map(t => `hover:${t}`)
])];

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: themeSafelist,
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        "inverse-surface": "#e5e2e1",
        "on-tertiary-fixed": "#23005c",
        "primary-fixed-dim": "#c8c6c7",
        "on-error": "#690005",
        "secondary-fixed-dim": "#00dbe9",
        "error": "#ffb4ab",
        "on-tertiary-container": "#895af4",
        "on-primary-fixed-variant": "#474647",
        "on-primary": "#313031",
        "on-primary-container": "#7a797a",
        "on-secondary": "#00363a",
        "on-surface": "#e5e2e1",
        "inverse-primary": "#5f5e5f",
        "surface-variant": "#353434",
        "outline-variant": "#46464a",
        "tertiary-container": "#0e002f",
        "surface-bright": "#3a3939",
        "on-primary-fixed": "#1c1b1c",
        "primary-fixed": "#e5e2e3",
        "surface-container": "#201f1f",
        "on-secondary-fixed": "#002022",
        "secondary-fixed": "#7df4ff",
        "surface-container-highest": "#353434",
        "error-container": "#93000a",
        "surface-container-lowest": "#0e0e0e",
        "on-surface-variant": "#c7c6ca",
        "on-background": "#e5e2e1",
        "inverse-on-surface": "#313030",
        "outline": "#919094",
        "tertiary": "#d0bcff",
        "surface-container-high": "#2b2a2a",
        "on-tertiary-fixed-variant": "#5516be",
        "secondary-container": "#00eefc",
        "on-error-container": "#ffdad6",
        "on-secondary-container": "#00686f",
        "surface-dim": "#141313",
        "surface": "#141313",
        "primary-container": "#0a0a0b",
        "surface-container-low": "#1c1b1b",
        "on-tertiary": "#3c0091",
        "on-secondary-fixed-variant": "#004f54",
        "tertiary-fixed": "#e9ddff",
        "surface-tint": "#c8c6c7",
        "tertiary-fixed-dim": "#d0bcff"
      },
      spacing: {
        "gutter": "24px",
        "margin-mobile": "20px",
        "margin-desktop": "64px",
        "unit": "4px",
        "container-max": "1440px"
      },
      fontFamily: {
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        "headline-xl": ["Sora", "sans-serif"],
        "label-caps": ["JetBrains Mono", "monospace"],
        "body-lg": ["Geist", "sans-serif"],
        "display-lg": ["Sora", "sans-serif"],
        "headline-xl-mobile": ["Sora", "sans-serif"],
        "headline-md": ["Sora", "sans-serif"],
        "body-md": ["Geist", "sans-serif"],
        "label-mono": ["JetBrains Mono", "monospace"]
      },
      fontSize: {
        "headline-xl": ["48px", { "lineHeight": "1.2", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "label-caps": ["12px", { "lineHeight": "1.2", "letterSpacing": "0.15em", "fontWeight": "700" }],
        "body-lg": ["18px", { "lineHeight": "1.6", "fontWeight": "400" }],
        "display-lg": ["72px", { "lineHeight": "1.1", "letterSpacing": "-0.04em", "fontWeight": "800" }],
        "headline-xl-mobile": ["32px", { "lineHeight": "1.2", "fontWeight": "700" }],
        "headline-md": ["24px", { "lineHeight": "1.4", "fontWeight": "600" }],
        "body-md": ["16px", { "lineHeight": "1.6", "fontWeight": "400" }],
        "label-mono": ["14px", { "lineHeight": "1.4", "letterSpacing": "0.05em", "fontWeight": "500" }]
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        'border-gradient': 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.02) 100%)',
        'cyan-glow': 'radial-gradient(ellipse at center, rgba(125,244,255,0.15) 0%, rgba(125,244,255,0) 70%)',
        'purple-glow': 'radial-gradient(ellipse at center, rgba(208,188,255,0.12) 0%, rgba(208,188,255,0) 70%)',
        'hero-overlay': 'linear-gradient(to bottom, rgba(8,8,9,0.1) 0%, rgba(8,8,9,1) 100%)',
        'premium-bg': 'radial-gradient(circle at 50% 0%, rgba(30,25,50,0.5) 0%, rgba(8,8,9,1) 60%)'
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
        full: "0.75rem"
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.32, 0.72, 0, 1)",
        apple: "cubic-bezier(0.32, 0.72, 0, 1)",
        "apple-bounce": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        cinematic: "cubic-bezier(0.23, 1, 0.32, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "gradient-x": {
          "0%, 100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
        },
        "gradient-y": {
          "0%, 100%": { "background-position": "50% 0%" },
          "50%": { "background-position": "50% 100%" },
        },
        "gradient-xy": {
          "0%, 100%": { "background-position": "0% 0%" },
          "25%": { "background-position": "100% 0%" },
          "50%": { "background-position": "100% 100%" },
          "75%": { "background-position": "0% 100%" },
        },
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "20%":       { transform: "translateX(-6px)" },
          "40%":       { transform: "translateX(6px)" },
          "60%":       { transform: "translateX(-4px)" },
          "80%":       { transform: "translateX(4px)" },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        "key-ripple": {
          "0%":   { transform: "translate(-50%, -50%) scale(0.35)", opacity: "0.65" },
          "100%": { transform: "translate(-50%, -50%) scale(2.6)",  opacity: "0" },
        },
        "key-press": {
          "0%":   { transform: "scale(1.14) translateY(0)" },
          "40%":  { transform: "scale(1.02) translateY(3px)" },
          "100%": { transform: "scale(1.14) translateY(0)" },
        },
        "star-pop": {
          "0%":   { transform: "scale(0) rotate(-60deg)", opacity: "0" },
          "55%":  { transform: "scale(1.3) rotate(10deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)",    opacity: "1" },
        },
        "count-glow": {
          "0%":   { textShadow: "0 0 0px rgba(255,255,255,0)" },
          "50%":  { textShadow: "0 0 18px rgba(255,255,255,0.7)" },
          "100%": { textShadow: "0 0 0px rgba(255,255,255,0)" },
        },
        /* ── Compete screen animations ── */
        "glass-shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%":      { opacity: "1",   transform: "scale(1.08)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-4px)" },
        },
        "slide-in-right": {
          "0%":   { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "badge-pop": {
          "0%":   { transform: "scale(0.6)", opacity: "0" },
          "60%":  { transform: "scale(1.15)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "gradient-x": "gradient-x 3s ease infinite",
        "gradient-y": "gradient-y 3s ease infinite",
        "gradient-xy": "gradient-xy 3s ease infinite",
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'key-ripple': 'key-ripple 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'key-press': 'key-press 0.18s ease-out',
        'star-pop': 'star-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'count-glow': 'count-glow 0.6s ease-out',
        'glass-shimmer': 'glass-shimmer 2.5s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2.5s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'badge-pop': 'badge-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}