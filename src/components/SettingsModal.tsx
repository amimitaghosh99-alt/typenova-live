import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { X, Settings, Skull, Ghost, Brain, Bot, Zap, FlipHorizontal, CloudFog, Magnet, Timer, LayoutGrid, Palette, Volume2, Check, Bug, ImagePlus, Loader2, RotateCcw, Info, BarChart, AlertTriangle, AlertCircle, Sparkles, Sun, Sliders, UploadCloud, Trash2, Cpu, Type, Play, ArrowLeft, Crosshair, Activity, Terminal, ShieldCheck, Radio, Layers, ArrowUpRight, Gauge, Moon, Waves, HelpCircle, HandHeart, Monitor, Eye, EyeOff, Database, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { springGlider, springSnappy, springFluid } from '@/lib/motion';
import { supabase } from '@/lib/supabase';
import { SettingsFAQPanel } from './SettingsFAQPanel';
import { THEMES, THEME_KEYS } from '@/data/constants';
import type { Theme } from '@/data/constants';
import { getDonationProgressPercent, PREMIUM_ACCENT } from '@/data/donation';
import { toast } from 'sonner';
import { AI_KEYS, PROVIDER_PRESETS, limitsForModel, ARU_PERSONAS, type AruPersona, type DebriefPolicy } from '@/lib/aiClient';
import { useSmartEngineConfig } from '@/hooks/useSmartEngineConfig';
import { useShaderConfig, SHADER_MODES, type ShaderSpeed } from '@/hooks/useShaderConfig';
import { CURATED_WALLPAPERS, type CuratedWallpaper } from '@/hooks/useWallpaperTheme';
import { ACCENT_SWATCHES } from '@/lib/colorExtractor';
import { useDisplayScale, DISPLAY_SCALE_PRESETS, MIN_DISPLAY_SCALE, MAX_DISPLAY_SCALE } from '@/hooks/useDisplayScale';
import { validateBugReportFile, formatFileSize, MAX_REPORT_FILE_SIZE_LABEL } from '@/lib/fileValidation';
import { loadFontOnDemand } from '@/lib/fontLoader';

interface SettingsModalProps {
  theme: Theme;
  onClose: () => void;
  // Modifiers
  suddenDeath: boolean;
  setSuddenDeath: (val: boolean) => void;
  ghostPacer: boolean;
  setGhostPacer: (val: boolean) => void;
  focusMode?: boolean;
  setFocusMode?: (val: boolean) => void;
  blindMode: boolean;
  setBlindMode: (val: boolean) => void;
  mirroredMode: boolean;
  toggleMirror: () => void;
  fogMode: boolean;
  setFogMode: (val: boolean) => void;
  stickyKeysMode: boolean;
  setStickyKeysMode: (val: boolean) => void;
  overclockedMode: boolean;
  setOverclockedMode: (val: boolean) => void;
  zenMode?: boolean;
  setZenMode?: (val: boolean) => void;
  themeIndex: number;
  selectTheme: (idx: number) => void;
  soundProfile: string;
  selectSoundProfile: (key: string) => void;
  themeFont: string;
  setThemeFont: (font: string) => void;
  wallpaperUrl: string | null;
  wallpaperTheme: Theme | null;
  brightness?: number;
  setBrightness?: (val: number) => void;
  blur?: number;
  setBlur?: (val: number) => void;
  customAccent?: string;
  setCustomAccent?: (accent: string) => void;
  selectCuratedWallpaper?: (preset: CuratedWallpaper) => void;
  handleFileUpload: (file: File) => void;
  clearWallpaper: () => void;
  onOpenWebHidBenchmark?: () => void;
  onPlayPreviewSound?: (profileKey?: string) => void;
  // onOpenDonate removed: the footer card navigates to /donate directly.
}

interface ToggleSwitchProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: React.ElementType;
  danger?: boolean;
  theme: Theme;
}

const ToggleSwitch = ({ label, description, checked, onChange, icon: Icon, danger = false, theme }: ToggleSwitchProps) => (
  <motion.div
    role="switch"
    tabIndex={0}
    aria-checked={checked}
    aria-label={`${label}: ${checked ? 'on' : 'off'}. ${description}`}
    whileHover={{ scale: 1.015, y: -2 }}
    whileTap={{ scale: 0.985 }}
    transition={springSnappy}
    onClick={() => onChange(!checked)}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onChange(!checked);
      }
    }}
    style={
      checked && !danger
        ? {
            borderColor: `rgba(${theme.glowPrimary}, 0.65)`,
            background: `linear-gradient(135deg, rgba(${theme.glowPrimary}, 0.26) 0%, rgba(${theme.glowPrimary}, 0.08) 50%, rgba(0, 0, 0, 0.4) 100%), rgba(16, 20, 32, 0.7)`,
            boxShadow: `0 0 24px rgba(${theme.glowPrimary}, 0.28), inset 0 1.5px 0.5px 0 rgba(255, 255, 255, 0.55), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(${theme.glowPrimary}, 0.2), inset 1px 0 0 rgba(255, 255, 255, 0.12)`,
          }
        : !danger ? {
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 40%, rgba(0, 0, 0, 0.3) 100%), rgba(12, 16, 24, 0.52)',
            borderColor: 'rgba(255, 255, 255, 0.12)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35), inset 0 1.5px 0.5px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.4), inset 1px 0 0 rgba(255, 255, 255, 0.08)',
          } : undefined
    }
    className={`relative w-full overflow-hidden flex items-center justify-between p-5 rounded-2xl border text-left transition-all cursor-pointer select-none backdrop-blur-xl group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080a12] ${
      checked
        ? danger
          ? 'bg-red-500/10 border-red-500/30 shadow-[inset_0_0_20px_rgba(239,68,68,0.1)]'
          : ''
        : 'hover:border-white/25 hover:scale-[1.01]'
    }`}
  >
    {/* Top Specular Glint Stripe */}
    <div
      className="absolute top-0 inset-x-0 h-[1.5px] pointer-events-none z-10"
      style={{
        background: checked && !danger
          ? `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.8) 50%, rgba(${theme.glowPrimary}, 0.8) 75%, transparent 100%)`
          : 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.35) 50%, transparent 100%)',
      }}
    />
    <div className="flex items-center gap-3.5 relative z-10">
      <motion.div
        animate={checked ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
        style={
          checked && !danger
            ? {
                backgroundColor: `rgba(${theme.glowPrimary}, 0.2)`,
                color: `rgb(${theme.glowPrimary})`,
              }
            : undefined
        }
        className={`p-2.5 rounded-xl transition-all ${
          checked
            ? danger
              ? 'bg-red-500/20 text-red-400'
              : ''
            : 'bg-white/5 text-zinc-400'
        }`}
      >
        <Icon size={18} />
      </motion.div>
      <div className="flex flex-col">
        <span className={`font-bold tracking-wide text-sm ${checked ? (danger ? 'text-red-400' : 'text-white') : 'text-zinc-300'}`}>
          {label}
        </span>
        <span className="text-[11px] font-medium text-zinc-400 mt-0.5 max-w-[260px] leading-relaxed">
          {description}
        </span>
      </div>
    </div>

    {/* Switch Track & Animated Spring Thumb */}
    <div
      style={
        checked && !danger
          ? {
              backgroundColor: `rgb(${theme.glowPrimary})`,
              boxShadow: `0 0 12px rgba(${theme.glowPrimary}, 0.5)`,
            }
          : undefined
      }
      className={`relative w-12 h-6.5 rounded-full transition-colors duration-300 p-0.5 flex items-center ${
        checked ? (danger ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]' : '') : 'bg-white/10'
      }`}
    >
      <motion.div
        layout
        transition={springSnappy}
        className={`w-5 h-5 rounded-full bg-white shadow-md ${checked ? 'ml-auto' : 'mr-auto opacity-80'}`}
      />
    </div>
  </motion.div>
);

const TAB_HEADERS: Record<string, { title: string; desc: string }> = {
  visuals: { title: 'Appearance & Audio', desc: 'Customize your core color theme, typography font, and keystroke audio' },
  shaders: { title: 'Background Shader Engine', desc: 'Choose real-time WebGL visualizers, animation flow speeds, and mouse physics' },
  gameplay: { title: 'Gameplay Modifiers', desc: 'Configure challenge modifiers, ghost pacers, and difficulty restrictions' },
  system: { title: 'System Safeguards', desc: 'Typing engine behavior and input safeguards' },
  ai: { title: 'Smart Engine', desc: 'Universal Bring-Your-Own-Key configuration and AI provider settings' },
  usage: { title: 'Local AI Stats & Quotas', desc: 'Monitor your real-time token rate limits and request counts' },
  faq: { title: 'Troubleshooting & FAQ', desc: 'Instant diagnostics and solutions for audio, input lag, multiplayer, AI coaching, and display issues' },
  report: { title: 'Report an Issue', desc: 'Send diagnostics, bug reports, and UX feedback' },
};

interface TabItem {
  id: 'visuals' | 'shaders' | 'gameplay' | 'system' | 'ai' | 'usage' | 'faq' | 'report';
  label: string;
  icon: React.ElementType;
  danger?: boolean;
}

const TABS: TabItem[] = [
  { id: 'visuals', label: 'Appearance', icon: Palette },
  { id: 'shaders', label: 'Shaders & FX', icon: Sparkles },
  { id: 'gameplay', label: 'Gameplay', icon: Skull },
  { id: 'system', label: 'System', icon: LayoutGrid },
  { id: 'ai', label: 'Smart Engine', icon: Brain },
  { id: 'usage', label: 'AI Stats', icon: BarChart },
  { id: 'faq', label: 'Help & FAQ', icon: HelpCircle },
  { id: 'report', label: 'Report Issue', icon: Bug, danger: true },
];

interface FontSpecimen {
  name: string;
  tag: string;
  category: 'code' | 'brutalist' | 'cyber' | 'speed' | 'vintage';
  categoryLabel: string;
  description: string;
  badge: string;
  sample: string;
  glyphs: string;
}

const FONT_CATEGORIES = [
  { id: 'all', label: 'All Typefaces' },
  { id: 'code', label: 'Code & Ligatures' },
  { id: 'brutalist', label: 'Brutalist & Tech' },
  { id: 'cyber', label: 'Cyber & Sci-Fi' },
  { id: 'speed', label: 'Speed & Ergonomic' },
  { id: 'vintage', label: 'Typewriter & Retro' },
] as const;

const FONT_PRESET_SAMPLES = {
  code: 'const [flow, speed] = [true, 142]; // => 99.8%',
  prose: 'The quick brown fox jumps over the lazy dog.',
  ligatures: 'fn => a === b && x !== y ? alpha >= 10 : <|>',
  glyphs: '0O 1lI {} () <> == != !== => <= && || 0123456789',
};

const FONT_SPECIMENS: FontSpecimen[] = [
  // ── Code & Ligatures ──
  {
    name: 'JetBrains Mono',
    tag: 'DEVELOPER GOLD',
    category: 'code',
    categoryLabel: 'Code & Ligatures',
    description: 'Enlarged lowercase x-height with unambiguous 0/O and 1/l glyphs.',
    badge: 'LIGATURES',
    sample: 'const [wpm, acc] = [142, 99.8];',
    glyphs: '0O 1lI {} => !==',
  },
  {
    name: 'Fira Code',
    tag: 'LIGATURE PIONEER',
    category: 'code',
    categoryLabel: 'Code & Ligatures',
    description: 'Iconic connected multi-character programming ligatures & operators.',
    badge: 'LIGATURES',
    sample: 'fn => speed >= 100 && flow === true',
    glyphs: '!= == === => <=',
  },
  {
    name: 'Cascadia Code',
    tag: 'MICROSOFT STUDIO',
    category: 'code',
    categoryLabel: 'Code & Ligatures',
    description: 'Modern Windows Terminal monospace with fluid ligature curves.',
    badge: 'LIGATURES',
    sample: 'interface Nova<T> => Promise<T>;',
    glyphs: '0O 1lI -> => <|>',
  },
  {
    name: 'Geist Mono',
    tag: 'VERCEL DESIGN',
    category: 'code',
    categoryLabel: 'Code & Ligatures',
    description: 'Ultra-modern Swiss geometric precision for developer tools.',
    badge: 'SWISS TECH',
    sample: 'export const engine: Flow = true;',
    glyphs: '0O 1lI [] () =>',
  },

  // ── Brutalist & Tech ──
  {
    name: 'Martian Mono',
    tag: 'NEO-BRUTALIST',
    category: 'brutalist',
    categoryLabel: 'Brutalist & Tech',
    description: 'Grotesque proportions with wide stance and dense visual cadence.',
    badge: 'BRUTALIST',
    sample: 'OVERCLOCK // 100% CADENCE',
    glyphs: '0O 1lI [0x4F] //',
  },
  {
    name: 'Azeret Mono',
    tag: 'GRAPHIC GROTESQUE',
    category: 'brutalist',
    categoryLabel: 'Brutalist & Tech',
    description: 'Bold character forms with architectural terminals & striking numbers.',
    badge: 'HIGH IMPACT',
    sample: 'SYS_CORE.ACTIVE[0x4F] = 120;',
    glyphs: '0O 1lI @#%&*{}',
  },
  {
    name: 'Space Mono',
    tag: '1960s SPACE AGE',
    category: 'brutalist',
    categoryLabel: 'Brutalist & Tech',
    description: 'Retro-futuristic headline monospace blending brutalism & sci-fi rigor.',
    badge: 'SPACE-AGE',
    sample: 'return trajectory * Math.PI;',
    glyphs: '0O 1lI ~^&*+=',
  },
  {
    name: 'IBM Plex Mono',
    tag: 'INDUSTRIAL HERITAGE',
    category: 'brutalist',
    categoryLabel: 'Brutalist & Tech',
    description: 'Disciplined corporate-industrial engineering font with razor precision.',
    badge: 'INDUSTRIAL',
    sample: 'class Engine extends Subsystem {}',
    glyphs: '0O 1lI -> {;} []',
  },

  // ── Cyber & Sci-Fi ──
  {
    name: 'Nova Mono',
    tag: 'CELESTIAL MATRIX',
    category: 'cyber',
    categoryLabel: 'Cyber & Sci-Fi',
    description: 'Monolinear futuristic glyphs with geometric loops matching TypeNova.',
    badge: 'SIGNATURE',
    sample: 'TYPENOVA.INIT_SYNAPSE(100)',
    glyphs: '0O 1lI () <> ==',
  },
  {
    name: 'Fragment Mono',
    tag: 'SWISS 45° ANGLES',
    category: 'cyber',
    categoryLabel: 'Cyber & Sci-Fi',
    description: 'High-contrast modern cuts with sharp 45-degree angled terminals.',
    badge: 'ANGULAR',
    sample: 'SELECT * FROM CYBERSPACE;',
    glyphs: '0O 1lI // \\ ==',
  },
  {
    name: 'Share Tech Mono',
    tag: 'TACTICAL HUD',
    category: 'cyber',
    categoryLabel: 'Cyber & Sci-Fi',
    description: 'Combat aviation HUD styling with military telemetry precision.',
    badge: 'MIL-SPEC',
    sample: 'NEURAL_LINK_STABLE // 120 WPM',
    glyphs: '0O 1lI [OK] ::',
  },

  // ── Speed & Ergonomic ──
  {
    name: 'Spline Sans Mono',
    tag: 'PROPORTIONAL SPEED',
    category: 'speed',
    categoryLabel: 'Speed & Ergonomic',
    description: 'Purpose-built for code clarity and reading ease during rapid typing.',
    badge: 'HIGH SPEED',
    sample: 'while (typing) { flow(); }',
    glyphs: '0O 1lI (flow) =>',
  },
  {
    name: 'Red Hat Mono',
    tag: 'HIGH CONTRAST',
    category: 'speed',
    categoryLabel: 'Speed & Ergonomic',
    description: 'Engineered by Red Hat for maximum legibility and zero visual fatigue.',
    badge: 'ZERO FATIGUE',
    sample: 'stream.pipe(process.stdout);',
    glyphs: '0O 1lI :: => .()',
  },
  {
    name: 'DM Mono',
    tag: 'GEOMETRIC MINIMAL',
    category: 'speed',
    categoryLabel: 'Speed & Ergonomic',
    description: 'Colophon Foundry’s clean geometric shapes with rounded human touch.',
    badge: 'MINIMALIST',
    sample: 'speed.measure(accuracy);',
    glyphs: '0O 1lI {} () .',
  },
  {
    name: 'Overpass Mono',
    tag: 'HIGHWAY GLANCE',
    category: 'speed',
    categoryLabel: 'Speed & Ergonomic',
    description: 'Signage-inspired geometry engineered for instant split-second recognition.',
    badge: 'INSTANT READ',
    sample: 'ACCEL_LANE_OPEN_99.4%',
    glyphs: '0O 1lI 100% []',
  },
  {
    name: 'Ubuntu Mono',
    tag: 'WARM HUMANIST',
    category: 'speed',
    categoryLabel: 'Speed & Ergonomic',
    description: 'Fluid rounded curves with warm stroke endings for effortless reading.',
    badge: 'HUMANIST',
    sample: 'comfortable.marathon(120);',
    glyphs: '0O 1lI (120) {}',
  },

  // ── Typewriter & Retro ──
  {
    name: 'Cutive Mono',
    tag: 'MECHANICAL TYPEWRITER',
    category: 'vintage',
    categoryLabel: 'Typewriter & Retro',
    description: 'Authentic mechanical typewriter typeface with crisp digital geometry.',
    badge: 'ANALOG',
    sample: 'The typewriter ribbon strikes true.',
    glyphs: '0O 1lI !? "..."',
  },
  {
    name: 'Special Elite',
    tag: 'INK-BLEED REMINGTON',
    category: 'vintage',
    categoryLabel: 'Typewriter & Retro',
    description: 'Tactile vintage mechanical keys with authentic subtle ink-bleed texture.',
    badge: 'INK BLEED',
    sample: 'Chapter IV. Midnight Keystrokes.',
    glyphs: '0O 1lI - - --',
  },
  {
    name: 'Silkscreen',
    tag: '8-BIT RETRO ARCADE',
    category: 'vintage',
    categoryLabel: 'Typewriter & Retro',
    description: 'Crisp arcade pixel monospace, incredible for speedruns and chiptune audio.',
    badge: 'PIXEL 8-BIT',
    sample: 'PRESS START TO TYPE 100%',
    glyphs: '0O 1lI 1UP 2UP',
  },
  {
    name: 'VT323',
    tag: 'CRT PHOSPHOR TERMINAL',
    category: 'vintage',
    categoryLabel: 'Typewriter & Retro',
    description: 'Classic 1980s green-screen CRT terminal font with vintage nostalgia.',
    badge: 'CRT PHOSPHOR',
    sample: 'READY. LOAD "*",8,1',
    glyphs: '0O 1lI > RUN',
  },
  {
    name: 'Victor Mono',
    tag: 'CURSIVE CODE FLUIDITY',
    category: 'vintage',
    categoryLabel: 'Typewriter & Retro',
    description: 'Monospace programming font featuring elegant semi-connected cursive italics.',
    badge: 'CURSIVE',
    sample: 'function elegantCode() { return flow; }',
    glyphs: '0O 1lI { return }',
  },
];


interface SoundMeta {
  key: string;
  label: string;
  switchType: string;
  soundDesc: string;
}

const SOUND_PROFILES: SoundMeta[] = [
  { key: 'thocky', label: 'Thocky', switchType: 'Linear 67g', soundDesc: 'Deep bottom-out lubricated thock' },
  { key: 'linear', label: 'Linear', switchType: 'Silent Red', soundDesc: 'Smooth cushioned silent travel' },
  { key: 'clicky', label: 'Clicky', switchType: 'Blue Clicky', soundDesc: 'High-pitch crisp tactile snap' },
  { key: 'raindrops', label: 'Raindrops', switchType: 'Aquatic', soundDesc: 'Soft gentle water droplet ripples' },
  { key: 'arcade', label: 'Arcade', switchType: '8-Bit Synth', soundDesc: 'Retro arcade digital chiptune' },
  { key: 'modelm', label: 'Model M', switchType: 'IBM Solenoid', soundDesc: 'Vintage tactile buckling spring' },
  { key: 'alpaca', label: 'Alpaca', switchType: 'Custom Poly', soundDesc: 'Crisp high-rebound polycarb pop' },
];

const PERSONA_ICONS: Record<AruPersona, React.ElementType> = {
  tactical: Crosshair,
  zen: Activity,
  cyberpunk: Terminal,
  hype: Zap,
};

export const SettingsModal = React.memo(function SettingsModal({
  theme,
  onClose,
  suddenDeath, setSuddenDeath,
  ghostPacer, setGhostPacer,
  focusMode, setFocusMode,
  zenMode, setZenMode,
  blindMode, setBlindMode,
  mirroredMode, toggleMirror,
  fogMode, setFogMode,
  stickyKeysMode, setStickyKeysMode,
  overclockedMode, setOverclockedMode,

  themeIndex, selectTheme,
  soundProfile, selectSoundProfile,
  themeFont, setThemeFont,
  wallpaperUrl, wallpaperTheme,
  brightness = 0.7, setBrightness,
  blur = 0, setBlur,
  customAccent = 'auto', setCustomAccent,
  selectCuratedWallpaper,
  handleFileUpload,
  clearWallpaper,
  onOpenWebHidBenchmark,
  onPlayPreviewSound,
}: SettingsModalProps) {
  const navigate = useNavigate();
  const openDonationPage = () => {
    onClose();
    navigate('/donate');
  };
  const [activeTab, setActiveTab] = useState<'gameplay' | 'visuals' | 'shaders' | 'system' | 'ai' | 'usage' | 'faq' | 'report'>('visuals');
  const donationGoalPercent = getDonationProgressPercent();
  const [isDragging, setIsDragging] = useState(false);
  const [wallpaperFit, setWallpaperFit] = useState<'contain' | 'cover'>('contain');
  const [isWallpaperLightboxOpen, setIsWallpaperLightboxOpen] = useState(false);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  // Close wallpaper full-view on Escape before closing modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isWallpaperLightboxOpen) {
        e.stopPropagation();
        setIsWallpaperLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isWallpaperLightboxOpen]);

  // Pre-load font specimens asynchronously when settings opens
  useEffect(() => {
    FONT_SPECIMENS.forEach(specimen => {
      loadFontOnDemand(specimen.name);
    });
  }, []);

  // In-webapp display scaling & OS DPI override
  const {
    scale: displayScale,
    counteractDpi,
    detectedOsScalePercent,
    effectiveZoom,
    setScale: setDisplayScale,
    setCounteractDpi,
    resetScale: resetDisplayScale,
  } = useDisplayScale();

  // Live Sandbox state
  const [sandboxInput, setSandboxInput] = useState('');
  const [sandboxWpm, setSandboxWpm] = useState(0);
  const sandboxStartTimeRef = useRef<number | null>(null);
  const [isTypingSandbox, setIsTypingSandbox] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playingSwitch, setPlayingSwitch] = useState<string | null>(null);
  const playingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Typography Playground State
  const [fontCategory, setFontCategory] = useState<string>('all');
  const [fontTestText, setFontTestText] = useState<string>('');
  const [fontPreset, setFontPreset] = useState<'signature' | 'code' | 'prose' | 'ligatures' | 'glyphs'>('signature');
  const [fontSizePreset, setFontSizePreset] = useState<number>(18);

  const filteredFonts = useMemo(() => {
    if (fontCategory === 'all') return FONT_SPECIMENS;
    return FONT_SPECIMENS.filter(s => s.category === fontCategory);
  }, [fontCategory]);

  const activeSpecimen = useMemo(() => {
    return FONT_SPECIMENS.find(s => s.name === themeFont) || FONT_SPECIMENS[0];
  }, [themeFont]);

  const triggerSoundPreview = (key: string) => {
    selectSoundProfile(key);
    onPlayPreviewSound?.(key);
    setPlayingSwitch(key);
    if (playingTimeoutRef.current) clearTimeout(playingTimeoutRef.current);
    playingTimeoutRef.current = setTimeout(() => {
      setPlayingSwitch(null);
    }, 750);
  };

  const handleSandboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSandboxInput(val);
    if (!sandboxStartTimeRef.current && val.length > 0) {
      sandboxStartTimeRef.current = Date.now();
    }
    onPlayPreviewSound?.(soundProfile);

    setIsTypingSandbox(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTypingSandbox(false), 350);

    if (sandboxStartTimeRef.current && val.length > 1) {
      const elapsedMinutes = (Date.now() - sandboxStartTimeRef.current) / 60000;
      if (elapsedMinutes > 0) {
        const computedWpm = Math.round((val.length / 5) / elapsedMinutes);
        setSandboxWpm(Math.min(computedWpm, 260));
      }
    }
  };

  const handleClearSandbox = () => {
    setSandboxInput('');
    setSandboxWpm(0);
    setIsTypingSandbox(false);
    sandboxStartTimeRef.current = null;
  };

  const handleGlassMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };
  
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail && typeof e.detail === 'string') {
        setActiveTab(e.detail as any);
      }
    };
    window.addEventListener('open_settings_tab', handler);
    return () => window.removeEventListener('open_settings_tab', handler);
  }, []);

  const shaderConfig = useShaderConfig();

  // AI Settings State
  const engineConfig = useSmartEngineConfig();
  const {
    byokKey, byokUrl, setByokUrl, byokModel,
    selectedProvider, setSelectedProvider, isAmbiguousSk,
    connectionStatus, connectionError, availableModels,
    handleKeyChange, handleModelChange, handleProviderSelect,
    persona, setPersona,
    debriefPolicy, setDebriefPolicy,
    latencyMs, isAutoFetching, engineTier,
    triggerAruPing, testConnection,
    keyPersistence, setKeyPersistence, clearKeyAndHistory,
  } = engineConfig;
  
  const [showApiKey, setShowApiKey] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [pingStatus, setPingStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [pingReply, setPingReply] = useState<string | null>(null);
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  // Usage Tracker State
  const [usageTokens, setUsageTokens] = useState(() => parseInt(localStorage.getItem(AI_KEYS.usageTokens) || '0', 10));
  const [usageRequests, setUsageRequests] = useState(() => parseInt(localStorage.getItem(AI_KEYS.usageRequests) || '0', 10));
  const [dailyTokens, setDailyTokens] = useState(() => parseInt(localStorage.getItem(AI_KEYS.dailyTokens) || '0', 10));
  const [dailyRequests, setDailyRequests] = useState(() => parseInt(localStorage.getItem(AI_KEYS.dailyRequests) || '0', 10));
  const [rollingUsage, setRollingUsage] = useState({ tokens: 0, requests: 0 });

  const activeLimits = limitsForModel(byokModel);

  useEffect(() => {
    const updateRolling = () => {
      try {
        const history: { ts: number; t: number; r: number }[] = JSON.parse(localStorage.getItem(AI_KEYS.rollingHistory) || '[]');
        const now = Date.now();
        const valid = history.filter(ev => now - ev.ts < 60000);
        setRollingUsage({
          tokens: valid.reduce((sum, ev) => sum + ev.t, 0),
          requests: valid.reduce((sum, ev) => sum + ev.r, 0)
        });
      } catch {
        setRollingUsage({ tokens: 0, requests: 0 });
      }
    };
    updateRolling();
    const handleSync = () => {
      setUsageTokens(parseInt(localStorage.getItem(AI_KEYS.usageTokens) || '0', 10));
      setUsageRequests(parseInt(localStorage.getItem(AI_KEYS.usageRequests) || '0', 10));
      setDailyTokens(parseInt(localStorage.getItem(AI_KEYS.dailyTokens) || '0', 10));
      setDailyRequests(parseInt(localStorage.getItem(AI_KEYS.dailyRequests) || '0', 10));
      updateRolling();
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('typenova_ai_sync', handleSync);
    const interval = setInterval(updateRolling, 5000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('typenova_ai_sync', handleSync);
    };
  }, []);

  const resetUsageStats = () => {
    localStorage.setItem(AI_KEYS.usageTokens, '0');
    localStorage.setItem(AI_KEYS.usageRequests, '0');
    localStorage.setItem(AI_KEYS.dailyTokens, '0');
    localStorage.setItem(AI_KEYS.dailyRequests, '0');
    localStorage.setItem(AI_KEYS.rollingHistory, '[]');
    setUsageTokens(0);
    setUsageRequests(0);
    setDailyTokens(0);
    setDailyRequests(0);
    setRollingUsage({ tokens: 0, requests: 0 });
    toast.success('Local usage stats reset.');
  };

  const [simInput, setSimInput] = useState('');

  // Bug Report State
  const [reportMsg, setReportMsg] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportFileSize, setReportFileSize] = useState<string>('');
  const [reportErrorMsg, setReportErrorMsg] = useState<string | null>(null);
  const [isValidatingFile, setIsValidatingFile] = useState(false);
  const [reportStatus, setReportStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const reportFileInputRef = useRef<HTMLInputElement | null>(null);
  const reportTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (reportTimeoutRef.current) clearTimeout(reportTimeoutRef.current);
    };
  }, []);

  const handleExportBackup = () => {
    try {
      const backup: Record<string, unknown> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('typenova_') || key.startsWith('aru_') || key.startsWith('stats_') || key.startsWith('settings_') || key.startsWith('history_') || key.startsWith('v2_'))) {
          try {
            backup[key] = JSON.parse(localStorage.getItem(key) || '""');
          } catch {
            backup[key] = localStorage.getItem(key);
          }
        }
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `typenova-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('System configuration backup exported');
    } catch {
      toast.error('Failed to export backup data');
    }
  };

  const handleClearCache = () => {
    if (window.confirm('Clear temporary engine cache and telemetry? Your preferences, scores, and custom wallpapers will remain intact.')) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('cache') || key.includes('temp') || key.includes('telemetry') || key.includes('ping'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      toast.success('Temporary engine cache cleared');
    }
  };

  const currentHeader = TAB_HEADERS[activeTab] || { title: 'Settings', desc: '' };
  const currentTab = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];
  const CurrentTabIcon = currentTab.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-[500] flex h-[100dvh] w-full min-h-0 max-w-full flex-col overflow-hidden bg-[#060810]/68 backdrop-blur-2xl backdrop-saturate-[190%] animate-in fade-in duration-300 md:flex-row"
      onClick={e => e.stopPropagation()}
    >

      {/* Left Sidebar */}
      <aside aria-label="Settings navigation" className="relative flex w-full shrink-0 flex-col border-b border-white/10 bg-black/40 p-3.5 shadow-[inset_-1px_0_0_rgba(255,255,255,0.08),inset_1px_1px_0_rgba(255,255,255,0.04)] backdrop-blur-3xl sm:p-4 md:h-full md:w-64 md:justify-between md:overflow-y-auto md:border-b-0 md:border-r md:p-5 lg:w-72 lg:p-6 custom-scrollbar">
        <div>
          {/* Header Badge */}
          <div className="mb-3.5 flex items-center gap-3 sm:mb-4 md:mb-5 lg:mb-6">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xl"
              style={{
                borderColor: `rgba(${theme.glowPrimary}, 0.4)`,
                backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                color: `rgb(${theme.glowPrimary})`,
                boxShadow: `0 0 20px rgba(${theme.glowPrimary}, 0.25)`,
              }}
            >
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide text-white">Settings</h2>
              <span className="text-[10px] font-mono text-zinc-400 tracking-wider uppercase block">COMMAND CENTER</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav aria-label="Settings sections" className="-mx-3.5 flex gap-1.5 overflow-x-auto px-3.5 pb-1.5 custom-scrollbar sm:-mx-4 sm:px-4 md:mx-0 md:flex-col md:overflow-visible md:px-0 md:pb-0">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  aria-current={isActive ? 'page' : undefined}
                  title={tab.label}
                  className={`group relative flex shrink-0 items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080a12] md:rounded-2xl md:px-4 md:py-3 ${
                    isActive
                      ? tab.danger
                        ? 'text-red-400'
                        : 'text-white'
                      : tab.danger
                      ? 'text-red-400/60 hover:text-red-400 hover:bg-red-500/10'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  {/* Dynamic Glider under active tab */}
                  {isActive && !tab.danger && (
                    <motion.div
                      layoutId="activeSettingsTab"
                      transition={springGlider}
                      className="absolute inset-0 rounded-2xl border"
                      style={{
                        borderColor: `rgba(${theme.glowPrimary}, 0.65)`,
                        backgroundColor: `rgba(${theme.glowPrimary}, 0.16)`,
                        boxShadow: `0 0 24px rgba(${theme.glowPrimary}, 0.28), inset 0 1px 1px rgba(255,255,255,0.35)`,
                      }}
                    />
                  )}
                  {isActive && tab.danger && (
                    <motion.div
                      layoutId="activeSettingsTab"
                      transition={springGlider}
                      className="absolute inset-0 rounded-2xl bg-red-500/15 border border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                    />
                  )}

                  <div className="relative z-10 flex items-center gap-3 min-w-0">
                    <motion.div
                      animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                        isActive
                          ? 'bg-white/10'
                          : 'bg-white/[0.03] text-zinc-500 group-hover:text-zinc-300'
                      }`}
                    >
                      <Icon size={15} className="shrink-0" />
                    </motion.div>
                    <span className="truncate text-xs tracking-wide">{tab.label}</span>
                  </div>

                  {isActive && (
                    <motion.span
                      layoutId="activeSettingsDot"
                      className="relative z-10 w-1.5 h-1.5 rounded-full shadow-sm"
                      style={{
                        backgroundColor: tab.danger ? '#f87171' : `rgb(${theme.glowPrimary})`,
                        boxShadow: `0 0 8px ${tab.danger ? '#f87171' : `rgb(${theme.glowPrimary})`}`,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer & Return to Arena button */}
        <div className="hidden md:flex flex-col gap-3 pt-5 border-t border-white/10">
          {/* Community Supporter Card — premium gold, links to the /donate page */}
          <button
            onClick={openDonationPage}
            className="w-full p-2.5 rounded-2xl border text-left transition-all group cursor-pointer"
            style={{
              borderColor: 'rgba(212, 175, 55, 0.30)',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.10), rgba(212, 175, 55, 0.04))',
              boxShadow: '0 0 15px rgba(212, 175, 55, 0.12)',
            }}
            title="Support TypeNova Community Goal"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <HandHeart
                  size={14}
                  className="group-hover:scale-110 transition-transform shrink-0"
                  style={{ color: PREMIUM_ACCENT }}
                />
                <span>Support TypeNova</span>
              </div>
              <span
                className="text-[10px] font-mono font-bold"
                style={{ color: PREMIUM_ACCENT }}
              >
                {donationGoalPercent}%
              </span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${donationGoalPercent}%`,
                  background: 'linear-gradient(90deg, #b8860b, #d4af37, #f0e68c)',
                  boxShadow: '0 0 8px rgba(212, 175, 55, 0.5)',
                }}
              />
            </div>
          </button>

          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              ONLINE
            </span>
            <span>TYPENOVA 3.1</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.02, x: -3 }}
            whileTap={{ scale: 0.97 }}
            transition={springSnappy}
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-mono font-bold transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_12px_rgba(0,0,0,0.3)] active:scale-95"
          >
            <ArrowLeft size={14} /> RETURN TO ARENA (ESC)
          </motion.button>
        </div>
      </aside>

      {/* Right Content */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overflow-x-hidden bg-transparent md:h-full">

        {/* Ambient Subsurface Theme Caustic Orbs */}
        <div
          className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full pointer-events-none blur-[140px] opacity-25 transition-all duration-700 pointer-events-none"
          style={{ background: `radial-gradient(circle, rgb(${theme.glowPrimary}), transparent 70%)` }}
        />
        <div
          className="absolute top-1/2 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none blur-[160px] opacity-15 transition-all duration-700 pointer-events-none"
          style={{ background: `radial-gradient(circle, rgb(${theme.glowPrimary}), transparent 70%)` }}
        />

        {/* Header */}
        <header className="relative z-10 flex shrink-0 items-start justify-between border-b border-white/10 bg-white/[0.02] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(0,0,0,0.3)] backdrop-blur-xl sm:items-center sm:px-6 sm:py-5 lg:px-10">
          <div className="min-w-0 pr-3">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest"
                style={{
                  borderColor: `rgba(${theme.glowPrimary}, 0.3)`,
                  backgroundColor: `rgba(${theme.glowPrimary}, 0.1)`,
                  color: `rgb(${theme.glowPrimary})`,
                }}
              >
                <CurrentTabIcon size={11} aria-hidden="true" />
                {currentTab.label}
              </span>
              <span className="hidden text-[10px] font-medium text-zinc-500 sm:inline">Changes apply instantly</span>
            </div>
            <h3 id="settings-title" className="text-xl font-black tracking-wide text-white sm:text-2xl lg:text-3xl">
              {currentHeader.title}
            </h3>
            <p className="mt-1 max-w-2xl text-xs text-pretty text-zinc-400 lg:text-sm">
              {currentHeader.desc}
            </p>
          </div>

          <motion.button
            type="button"
            aria-label="Close settings"
            whileHover={{ scale: 1.08, rotate: 90 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={onClose}
            className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 shadow-xl transition-colors cursor-pointer hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080a12]"
            title="Close (ESC)"
          >
            <X size={18} />
          </motion.button>
        </header>

        <div className="min-h-0 w-full max-w-[1600px] flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 pb-12 custom-scrollbar sm:px-6 sm:py-6 sm:pb-14 lg:px-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-8"
            >

            {activeTab === 'gameplay' && (() => {
              const activeCount = [suddenDeath, overclockedMode, blindMode, fogMode, mirroredMode, ghostPacer, focusMode, zenMode].filter(Boolean).length;
              const xpBonusPercent = Math.round(
                (suddenDeath ? 25 : 0) +
                (overclockedMode ? 25 : 0) +
                (blindMode ? 30 : 0) +
                (fogMode ? 20 : 0) +
                (mirroredMode ? 40 : 0) +
                (ghostPacer ? 15 : 0)
              );
              const totalMult = (1 + xpBonusPercent / 100).toFixed(2);

              const threat = 
                activeCount >= 4
                  ? { label: 'NIGHTMARE PROTOCOL', badgeBg: 'bg-red-500/10 text-red-400 border-red-500/30', glow: '#ef4444', desc: 'Extreme sensory disruption and zero-tolerance fatal error stakes.' }
                  : activeCount >= 2
                  ? { label: 'HARDCORE CHALLENGE', badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', glow: '#f59e0b', desc: 'Heightened precision demands with active cognitive handicaps.' }
                  : activeCount === 1
                  ? { label: 'TARGETED MODIFIER', badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', glow: '#10b981', desc: 'Single constraint active for precision mechanics training.' }
                  : { label: 'STANDARD ARENA', badgeBg: 'bg-white/10 text-zinc-300 border-white/15', glow: `rgb(${theme.glowPrimary})`, desc: 'Standard baseline arena mechanics with unconstrained feedback.' };

              const previewText = "the quick brown fox jumps over the lazy dog";

              const resetAll = () => {
                setSuddenDeath(false);
                setOverclockedMode(false);
                setBlindMode(false);
                setFogMode(false);
                if (mirroredMode) toggleMirror();
                setGhostPacer(false);
                if (setFocusMode) setFocusMode(false);
                if (setZenMode) setZenMode(false);
                toast.success('All modifiers reset to Standard.');
              };

              const applyPreset = (preset: 'hardcore' | 'stealth' | 'rival' | 'nightmare') => {
                resetAll();
                setTimeout(() => {
                  if (preset === 'hardcore') {
                    setSuddenDeath(true);
                    setOverclockedMode(true);
                    toast.success('Armed: Hardcore Duel (Sudden Death + Overclocked)');
                  } else if (preset === 'stealth') {
                    setBlindMode(true);
                    setFogMode(true);
                    toast.success('Armed: Stealth Reflexes (Blind Mode + Fog)');
                  } else if (preset === 'rival') {
                    setGhostPacer(true);
                    toast.success('Armed: Ghost Net Rival Pacer');
                  } else if (preset === 'nightmare') {
                    setSuddenDeath(true);
                    setOverclockedMode(true);
                    setFogMode(true);
                    if (!mirroredMode) toggleMirror();
                    toast.success('Armed: Nightmare Protocol');
                  }
                }, 50);
              };

              return (
                <div className="flex flex-col w-full gap-6 animate-in fade-in duration-300">
                  {/* 1. TOP HEADER & THREAT LEVEL BANNER */}
                  <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-2xl relative overflow-hidden">
                    <div
                      className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
                      style={{ backgroundColor: threat.glow }}
                    />

                    <div className="flex items-center gap-4 relative z-10">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xl shrink-0"
                        style={{
                          backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                          borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                          color: `rgb(${theme.glowPrimary})`,
                          boxShadow: `0 0 25px rgba(${theme.glowPrimary}, 0.2)`,
                        }}
                      >
                        <Crosshair size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-black tracking-wide text-white uppercase font-mono">
                            Gameplay Challenge Engine
                          </span>
                          <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${threat.badgeBg}`}>
                            {threat.label}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                          {threat.desc}
                        </p>
                      </div>
                    </div>

                    {/* Multiplier & Presets */}
                    <div className="flex flex-wrap items-center gap-2 relative z-10 shrink-0">
                      {/* XP Multiplier Badge */}
                      <div
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl border backdrop-blur-xl shadow-lg"
                        style={{
                          backgroundColor: xpBonusPercent > 0 ? `rgba(${theme.glowPrimary}, 0.15)` : 'rgba(255, 255, 255, 0.05)',
                          borderColor: xpBonusPercent > 0 ? `rgba(${theme.glowPrimary}, 0.4)` : 'rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <Zap size={14} style={{ color: `rgb(${theme.glowPrimary})` }} className={xpBonusPercent > 0 ? 'fill-current' : ''} />
                        <div className="flex flex-col text-left">
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-400">Match Yield</span>
                          <span className="text-xs font-mono font-bold text-white tracking-wide">
                            {totalMult}x XP {xpBonusPercent > 0 ? `(+${xpBonusPercent}%)` : 'Base'}
                          </span>
                        </div>
                      </div>

                      {/* Presets */}
                      <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => applyPreset('hardcore')}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider text-red-300 hover:text-white hover:bg-red-500/20 transition-all cursor-pointer"
                          title="Sudden Death + Overclocked"
                        >
                          Hardcore
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('stealth')}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider hover:text-white transition-all cursor-pointer"
                          style={{
                            color: `rgb(${theme.glowPrimary})`,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = `rgba(${theme.glowPrimary}, 0.15)`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="Blind Mode + Fog"
                        >
                          Stealth
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('rival')}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider hover:text-white transition-all cursor-pointer"
                          style={{
                            color: `rgb(${theme.glowPrimary})`,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = `rgba(${theme.glowPrimary}, 0.15)`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="Ghost Pacer"
                        >
                          Rival
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('nightmare')}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider hover:text-white transition-all cursor-pointer"
                          style={{
                            color: `rgb(${theme.glowPrimary})`,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = `rgba(${theme.glowPrimary}, 0.15)`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="All Lethal Modifiers"
                        >
                          Nightmare
                        </button>
                        {activeCount > 0 && (
                          <button
                            type="button"
                            onClick={resetAll}
                            className="px-2 py-1.5 rounded-lg text-[10px] font-mono text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer border-l border-white/10 ml-0.5"
                            title="Reset all to Standard"
                          >
                            <RotateCcw size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. MAIN MODIFIERS GRID (8 CARDS) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
                    {[
                      {
                        id: 'suddenDeath',
                        title: 'Sudden Death',
                        desc: 'One mistake immediately terminates the test. Absolute 100% precision demanded.',
                        badge: '+25% XP • Fatal',
                        icon: Skull,
                        checked: suddenDeath,
                        toggle: () => setSuddenDeath(!suddenDeath),
                        danger: true,
                      },
                      {
                        id: 'overclocked',
                        title: 'Overclocked',
                        desc: 'Fails the run if live typing velocity dips below your personal rolling average speed.',
                        badge: '+25% XP • Velocity',
                        icon: Timer,
                        checked: overclockedMode,
                        toggle: () => setOverclockedMode(!overclockedMode),
                        danger: true,
                      },
                      {
                        id: 'blind',
                        title: 'Blind Mode',
                        desc: 'Letters dissolve into stealth dots as you type. Forces reliance on tactile memory.',
                        badge: '+30% XP • Sensory',
                        icon: Brain,
                        checked: blindMode,
                        toggle: () => setBlindMode(!blindMode),
                        danger: false,
                      },
                      {
                        id: 'fog',
                        title: 'Fog Mode',
                        desc: 'Conceals ahead words with dense visual fog until your cursor advances near.',
                        badge: '+20% XP • Reflex',
                        icon: CloudFog,
                        checked: fogMode,
                        toggle: () => setFogMode(!fogMode),
                        danger: false,
                      },
                      {
                        id: 'mirrored',
                        title: 'Mirrored Mode',
                        desc: 'Horizontally inverts the text display backwards. Re-wires optical coordination.',
                        badge: '+40% XP • Spatial',
                        icon: FlipHorizontal,
                        checked: mirroredMode,
                        toggle: toggleMirror,
                        danger: false,
                      },
                      {
                        id: 'ghost',
                        title: 'Ghost Pacer',
                        desc: 'Spawns your personal best recording as a phantom rival gliding across the test lane.',
                        badge: '+15% XP • Rival',
                        icon: Ghost,
                        checked: ghostPacer,
                        toggle: () => setGhostPacer(!ghostPacer),
                        danger: false,
                      },
                      {
                        id: 'focus',
                        title: 'Focus Mode',
                        desc: 'Dims background elements and non-active lines to preserve absolute focus on the active word.',
                        badge: 'Tunnel Vision',
                        icon: Crosshair,
                        checked: !!focusMode,
                        toggle: () => setFocusMode && setFocusMode(!focusMode),
                        danger: false,
                      },
                      {
                        id: 'zen',
                        title: 'Zen Mode',
                        desc: 'Hides live WPM speedometers, timers, and error gauges until you cross the finish line.',
                        badge: 'Pure Flow',
                        icon: Sun,
                        checked: !!zenMode,
                        toggle: () => setZenMode && setZenMode(!zenMode),
                        danger: false,
                      },
                    ].map((mod) => (
                      <div
                        key={mod.id}
                        onClick={mod.toggle}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between gap-3 shadow-lg relative overflow-hidden group ${
                          mod.checked
                            ? mod.danger
                              ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                              : 'border-white/30 shadow-lg'
                            : 'bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                        }`}
                        style={
                          mod.checked && !mod.danger
                            ? {
                                backgroundColor: `rgba(${theme.glowPrimary}, 0.1)`,
                                borderColor: `rgba(${theme.glowPrimary}, 0.45)`,
                                boxShadow: `0 0 20px rgba(${theme.glowPrimary}, 0.15)`,
                              }
                            : undefined
                        }
                      >
                        {/* Top Bar: Icon + Badge + Clean Toggle Switch */}
                        <div className="flex items-center justify-between gap-2">
                          <div
                            className={`p-2.5 rounded-xl transition-all ${
                              mod.checked
                                ? mod.danger
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'text-white'
                                : 'bg-white/5 text-zinc-400 group-hover:text-zinc-200'
                            }`}
                            style={
                              mod.checked && !mod.danger
                                ? {
                                    backgroundColor: `rgba(${theme.glowPrimary}, 0.2)`,
                                    color: `rgb(${theme.glowPrimary})`,
                                  }
                                : undefined
                            }
                          >
                            <mod.icon size={18} />
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                                mod.checked && mod.danger
                                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                  : 'bg-white/10 text-zinc-300 border border-white/10'
                              }`}
                            >
                              {mod.badge}
                            </span>

                            {/* Tactile Mini Switch - fully contained with zero edge bleed */}
                            <div
                              className={`relative w-9 h-5 rounded-full transition-colors duration-200 p-0.5 flex items-center shrink-0 ${
                                mod.checked
                                  ? mod.danger
                                    ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                                    : ''
                                  : 'bg-white/15'
                              }`}
                              style={
                                mod.checked && !mod.danger
                                  ? {
                                      backgroundColor: `rgb(${theme.glowPrimary})`,
                                      boxShadow: `0 0 10px rgba(${theme.glowPrimary}, 0.4)`,
                                    }
                                  : undefined
                              }
                            >
                              <motion.div
                                layout
                                transition={springSnappy}
                                className={`w-4 h-4 rounded-full bg-white shadow-sm ${
                                  mod.checked ? 'ml-auto' : 'mr-auto opacity-75'
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Bottom Content: Title + Description with clean padding */}
                        <div className="flex flex-col mt-1">
                          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white mb-1.5">
                            {mod.title}
                          </h4>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">
                            {mod.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 3. INTERACTIVE LIVE MODIFIER SIMULATOR & SANDBOX */}
                  <div className="w-full bg-black/50 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: `rgb(${theme.glowPrimary})` }} />
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                          Live Modifier Sandbox & Optical Preview
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        Type in the box below to test active modifiers in real-time
                      </span>
                    </div>

                    {/* Simulated Text Arena */}
                    <div className="relative my-4 p-6 rounded-xl bg-black/60 border border-white/10 min-h-[90px] flex items-center justify-center overflow-hidden">
                      {/* Sudden Death Red Aura */}
                      {suddenDeath && (
                        <div className="absolute inset-0 bg-red-500/5 border border-red-500/20 pointer-events-none animate-pulse" />
                      )}

                      {/* Mirrored transform applied */}
                      <div className={`text-lg sm:text-xl font-mono tracking-wider font-semibold transition-all select-none ${
                        mirroredMode ? 'scale-x-[-1]' : ''
                      }`}>
                        {previewText.split(' ').map((word, wIdx) => {
                          // Fog effect: blur words past first 3
                          const isFogged = fogMode && wIdx > 2;
                          // Blind effect: convert to dots
                          const displayWord = blindMode ? '•••••' : word;

                          return (
                            <span
                              key={wIdx}
                              className={`inline-block mr-2.5 transition-all ${
                                isFogged ? 'opacity-20 blur-[3px] select-none' : 'text-zinc-200'
                              }`}
                              style={{
                                color: wIdx === 0 ? `rgb(${theme.glowPrimary})` : undefined,
                              }}
                            >
                              {displayWord}
                            </span>
                          );
                        })}
                      </div>

                      {/* Ghost Pacer Preview Avatar */}
                      {ghostPacer && (
                        <motion.div
                          animate={{ x: [-150, 150, -150] }}
                          transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                          className="absolute top-2 flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                            borderColor: `rgba(${theme.glowPrimary}, 0.3)`,
                            color: `rgb(${theme.glowPrimary})`,
                          }}
                        >
                          <Ghost size={11} />
                          <span>PB Ghost // 88 WPM</span>
                        </motion.div>
                      )}

                      {/* Sudden Death Warning Badge */}
                      {suddenDeath && (
                        <div className="absolute bottom-2 right-3 text-[9px] font-mono uppercase tracking-widest text-red-400 flex items-center gap-1.5 font-bold">
                          <Skull size={11} /> Zero Error Tolerance Armed
                        </div>
                      )}
                    </div>

                    {/* Interactive Sandbox Test Input */}
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={simInput}
                        onChange={(e) => setSimInput(e.target.value)}
                        placeholder="Type test words here to feel active modifiers..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                      />
                      {simInput && (
                        <button
                          type="button"
                          onClick={() => setSimInput('')}
                          className="px-3 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 4. BOTTOM FOOTER BAR */}
                  <div className="w-full bg-black/30 border border-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white/5 text-zinc-300 shrink-0">
                        <Activity size={16} style={{ color: `rgb(${theme.glowPrimary})` }} />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-mono font-bold text-zinc-200">
                          Competitive Integrity System
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          Active challenge modifiers grant legitimate XP boosts and unlock exclusive difficulty accolades.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={resetAll}
                        className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-white/10 transition-all border border-white/10 cursor-pointer shadow-sm"
                      >
                        Reset All
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {activeTab === 'visuals' && (
              <div className="space-y-6">
                {/* Theme Section */}
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 tracking-wider uppercase mb-3 flex items-center gap-2">
                    <Palette size={14} style={{ color: `rgb(${theme.glowPrimary})` }} /> Color Theme
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2.5">
                    {THEME_KEYS.map((key, idx) => {
                      const t = THEMES[key];
                      const isActive = idx === themeIndex;
                      return (
                        <motion.button
                          key={key}
                          whileHover={{ scale: 1.04, y: -2 }}
                          whileTap={{ scale: 0.96 }}
                          transition={springSnappy}
                          onClick={() => selectTheme(idx)}
                          style={
                            isActive
                              ? {
                                  borderColor: `rgba(${t.glowPrimary}, 0.75)`,
                                  background: `linear-gradient(135deg, rgba(${t.glowPrimary}, 0.32) 0%, rgba(${t.glowPrimary}, 0.1) 50%, rgba(0, 0, 0, 0.35) 100%), rgba(16, 20, 32, 0.72)`,
                                  boxShadow: `0 0 24px rgba(${t.glowPrimary}, 0.4), inset 0 1.5px 0.5px 0 rgba(255, 255, 255, 0.65), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.5), inset 0 0 18px rgba(${t.glowPrimary}, 0.25), inset 1px 0 0 rgba(255, 255, 255, 0.15)`,
                                }
                              : {
                                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 40%, rgba(0, 0, 0, 0.3) 100%), rgba(12, 16, 24, 0.55)',
                                  borderColor: 'rgba(255, 255, 255, 0.12)',
                                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35), inset 0 1.5px 0.5px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.4), inset 1px 0 0 rgba(255, 255, 255, 0.08)',
                                }
                          }
                          className={`relative overflow-hidden min-w-0 flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer select-none border backdrop-blur-xl ${
                            isActive
                              ? 'text-white'
                              : 'text-zinc-400 hover:border-white/25 hover:text-white hover:scale-[1.02]'
                          }`}
                        >
                          {/* Top Specular Glint Line */}
                          <div
                            className="absolute top-0 inset-x-0 h-[1.5px] pointer-events-none"
                            style={{
                              background: isActive
                                ? `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.85) 50%, rgba(${t.glowPrimary}, 0.8) 75%, transparent 100%)`
                                : 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
                            }}
                          />
                          <div className="flex items-center gap-2 min-w-0 relative z-10">
                            <motion.span
                              animate={isActive ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                              style={{
                                backgroundColor: `rgb(${t.glowPrimary})`,
                                boxShadow: `0 0 8px rgba(${t.glowPrimary}, 0.7)`,
                              }}
                            />
                            <span className="truncate capitalize">{t.name}</span>
                          </div>
                          {isActive && (
                            <motion.div
                              initial={{ scale: 0, rotate: -45 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                              className="relative z-10"
                            >
                              <Check
                                size={13}
                                className="shrink-0"
                                style={{ color: `rgb(${t.glowPrimary})` }}
                              />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                    
                    {/* Custom Wallpaper Special Button */}
                    <motion.button
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      transition={springSnappy}
                      onClick={() => {
                        selectTheme(-1);
                        if (!wallpaperUrl && wallpaperInputRef.current) {
                          wallpaperInputRef.current.click();
                        }
                      }}
                      style={
                        themeIndex === -1
                          ? {
                              borderColor: `rgba(${wallpaperTheme?.glowPrimary || theme.glowPrimary}, 0.75)`,
                              background: `linear-gradient(135deg, rgba(${wallpaperTheme?.glowPrimary || theme.glowPrimary}, 0.32) 0%, rgba(${wallpaperTheme?.glowPrimary || theme.glowPrimary}, 0.1) 50%, rgba(0, 0, 0, 0.35) 100%), rgba(16, 20, 32, 0.72)`,
                              boxShadow: `0 0 24px rgba(${wallpaperTheme?.glowPrimary || theme.glowPrimary}, 0.4), inset 0 1.5px 0.5px 0 rgba(255, 255, 255, 0.65), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.5), inset 0 0 18px rgba(${wallpaperTheme?.glowPrimary || theme.glowPrimary}, 0.25), inset 1px 0 0 rgba(255, 255, 255, 0.15)`,
                            }
                          : {
                              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 40%, rgba(0, 0, 0, 0.3) 100%), rgba(12, 16, 24, 0.55)',
                              borderColor: 'rgba(255, 255, 255, 0.12)',
                              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35), inset 0 1.5px 0.5px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.4), inset 1px 0 0 rgba(255, 255, 255, 0.08)',
                            }
                      }
                      className={`relative overflow-hidden min-w-0 flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer select-none border backdrop-blur-xl ${
                        themeIndex === -1
                          ? 'text-white'
                          : 'text-zinc-400 hover:border-white/25 hover:text-white hover:scale-[1.02]'
                      }`}
                    >
                      {/* Top Specular Glint Line */}
                      <div
                        className="absolute top-0 inset-x-0 h-[1.5px] pointer-events-none"
                        style={{
                          background: themeIndex === -1
                            ? `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.85) 50%, rgba(${wallpaperTheme?.glowPrimary || theme.glowPrimary}, 0.8) 75%, transparent 100%)`
                            : 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
                        }}
                      />
                      <div className="flex items-center gap-2 min-w-0 relative z-10">
                        <ImagePlus
                          size={14}
                          className={themeIndex === -1 ? '' : 'text-zinc-400'}
                          style={{ color: themeIndex === -1 ? `rgb(${theme.glowPrimary})` : undefined }}
                        />
                        <span className="truncate">Custom</span>
                      </div>
                      {themeIndex === -1 && (
                        <motion.div
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                          className="relative z-10"
                        >
                          <Check
                            size={13}
                            className="shrink-0"
                            style={{ color: `rgb(${wallpaperTheme?.glowPrimary || theme.glowPrimary})` }}
                          />
                        </motion.div>
                      )}
                    </motion.button>
                  </div>

                  {/* Hidden Global File Input */}
                  <input
                    ref={wallpaperInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file);
                        selectTheme(-1);
                      }
                    }}
                  />
                  
                  {/* ═══ Custom Wallpaper Command Deck ═══ */}
                  {themeIndex === -1 && (
                    <div
                      onMouseMove={handleGlassMouseMove}
                      className="mt-4 p-4 sm:p-5 rounded-2xl border flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 shadow-2xl backdrop-blur-2xl relative overflow-hidden transition-all duration-300 group"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.025) 35%, rgba(0, 0, 0, 0.35) 100%), rgba(14, 18, 28, 0.6)',
                        borderColor: `rgba(${theme.glowPrimary}, 0.4)`,
                        boxShadow: `0 24px 60px -12px rgba(0, 0, 0, 0.7), inset 0 1.5px 0.5px 0 rgba(255, 255, 255, 0.65), inset 0 -1.5px 1px 0 rgba(0, 0, 0, 0.6), inset 0 0 36px -6px rgba(${theme.glowPrimary}, 0.28), inset 1px 0 0 rgba(255, 255, 255, 0.14), inset -1px 0 0 rgba(255, 255, 255, 0.07)`,
                      }}
                    >
                      {/* Top Specular Chromatic Dispersion Glint Stripe */}
                      <div
                        className="absolute top-0 inset-x-0 h-[1.5px] pointer-events-none z-20"
                        style={{
                          background: `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.15) 15%, rgba(255, 255, 255, 0.95) 45%, rgba(${theme.glowPrimary}, 0.85) 65%, rgba(255, 255, 255, 0.3) 85%, transparent 100%)`,
                        }}
                      />

                      {/* Dynamic Pointer Specular Refraction Glint */}
                      <div
                        className="absolute inset-0 pointer-events-none rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background: 'radial-gradient(circle 320px at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 255, 255, 0.12), transparent 70%)',
                        }}
                      />

                      {/* Diagonal Specular Caustic Sheen */}
                      <div
                        className="absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 28%, transparent 55%, rgba(255, 255, 255, 0.04) 100%)',
                        }}
                      />
                      
                      {/* Top Row: Preview/Dropzone (Left) + Sliders & Neon Accent (Right) */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch relative z-10">
                        
                        {/* Left Column (Preview or Dropzone): 5 cols on lg */}
                        <div className="lg:col-span-5 flex flex-col justify-between">
                          {wallpaperUrl ? (
                            <div
                              className="w-full relative aspect-video rounded-xl overflow-hidden border shadow-xl group bg-black/90"
                              style={{
                                borderColor: 'rgba(255, 255, 255, 0.25)',
                                boxShadow: `0 12px 32px -8px rgba(0, 0, 0, 0.75), inset 0 1.5px 0.5px 0 rgba(255, 255, 255, 0.55), inset 0 -1.5px 1px 0 rgba(0, 0, 0, 0.6), inset 0 0 24px rgba(${theme.glowPrimary}, 0.2), inset 1px 0 0 rgba(255, 255, 255, 0.15)`,
                              }}
                            >
                              {/* Ambient blurred backdrop layer: fills letterbox edges */}
                              <div
                                className="absolute inset-0 bg-cover bg-center blur-xl opacity-40 scale-110 pointer-events-none transition-all duration-700"
                                style={{ backgroundImage: `url(${wallpaperUrl})` }}
                              />

                              {/* Sharp Foreground Image Layer (16:9 Uncropped by default) */}
                              <div
                                className={`absolute inset-0 transition-transform duration-500 group-hover:scale-[1.01] ${
                                  wallpaperFit === 'contain'
                                    ? 'bg-contain bg-center bg-no-repeat'
                                    : 'bg-cover bg-center'
                                }`}
                                style={{
                                  backgroundImage: `url(${wallpaperUrl})`,
                                  filter: `brightness(${brightness}) blur(${blur}px)`,
                                }}
                              />

                              {/* Top Bar Overlay */}
                              <div className="absolute top-0 inset-x-0 p-2.5 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between z-20">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                  <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">
                                    Active View
                                  </span>
                                </div>

                                <div className="flex items-center gap-1">
                                  {/* Fit Mode Toggle */}
                                  <div className="flex items-center bg-black/70 border border-white/15 rounded-lg p-0.5 backdrop-blur-md shadow-sm">
                                    <button
                                      type="button"
                                      onClick={() => setWallpaperFit('contain')}
                                      className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                        wallpaperFit === 'contain'
                                          ? 'bg-white/20 text-white shadow-sm'
                                          : 'text-zinc-400 hover:text-white'
                                      }`}
                                      style={wallpaperFit === 'contain' ? { color: `rgb(${theme.glowPrimary})` } : undefined}
                                      title="Full View: Shows entire wallpaper without cutting off top or bottom"
                                    >
                                      Fit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setWallpaperFit('cover')}
                                      className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                        wallpaperFit === 'cover'
                                          ? 'bg-white/20 text-white shadow-sm'
                                          : 'text-zinc-400 hover:text-white'
                                      }`}
                                      style={wallpaperFit === 'cover' ? { color: `rgb(${theme.glowPrimary})` } : undefined}
                                      title="Fill: Fills container edge-to-edge"
                                    >
                                      Fill
                                    </button>
                                  </div>

                                  {/* Inspect Button */}
                                  <button
                                    type="button"
                                    onClick={() => setIsWallpaperLightboxOpen(true)}
                                    className="px-2 py-1 bg-black/70 hover:bg-white/15 border border-white/15 rounded-lg text-[9px] font-mono font-bold text-zinc-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer backdrop-blur-md shadow-sm"
                                    title="Open Fullscreen Wallpaper Viewer"
                                  >
                                    <Eye size={11} style={{ color: `rgb(${theme.glowPrimary})` }} />
                                    <span>Inspect</span>
                                  </button>
                                </div>
                              </div>

                              {/* Bottom Action Bar */}
                              <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between z-20">
                                <span className="text-[10px] font-mono text-zinc-300 drop-shadow">
                                  {Math.round(brightness * 100)}% / {blur}px
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => wallpaperInputRef.current?.click()}
                                    className="px-2.5 py-1 bg-white/15 hover:bg-white/25 border border-white/20 rounded-lg text-[10px] font-bold text-white transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-md backdrop-blur-md"
                                    title="Upload new image"
                                  >
                                    <UploadCloud size={11} /> Change
                                  </button>
                                  <button
                                    onClick={() => { clearWallpaper(); selectTheme(0); }}
                                    className="p-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 rounded-lg transition-all cursor-pointer active:scale-95 backdrop-blur-md"
                                    title="Remove Wallpaper"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                              onDragLeave={() => setIsDragging(false)}
                              onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                const file = e.dataTransfer.files?.[0];
                                if (file) {
                                  handleFileUpload(file);
                                  selectTheme(-1);
                                }
                              }}
                              onClick={() => wallpaperInputRef.current?.click()}
                              className={`w-full aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all gap-2 p-3 text-center backdrop-blur-xl ${
                                isDragging
                                  ? 'scale-[1.01]'
                                  : 'border-white/20 hover:border-white/40 hover:bg-white/[0.03] text-zinc-400 hover:text-zinc-200'
                              }`}
                              style={isDragging ? {
                                borderColor: `rgb(${theme.glowPrimary})`,
                                backgroundColor: `rgba(${theme.glowPrimary}, 0.1)`,
                                color: `rgb(${theme.glowPrimary})`,
                              } : {
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(0, 0, 0, 0.25) 100%), rgba(10, 12, 18, 0.45)',
                                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                              }}
                            >
                              <div
                                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner"
                                style={{ color: `rgb(${theme.glowPrimary})` }}
                              >
                                <UploadCloud size={16} />
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[11px] font-bold tracking-wider uppercase text-white">
                                  Upload Wallpaper
                                </span>
                                <span className="text-[9px] text-zinc-400">
                                  Drag & drop or browse
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Column: Controls (Brightness, Blur, Swatches): 7 cols on lg */}
                        <div
                          className="lg:col-span-7 flex flex-col justify-between gap-3 p-3 sm:p-3.5 rounded-xl border backdrop-blur-xl relative overflow-hidden"
                          style={{
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 40%, rgba(0, 0, 0, 0.3) 100%), rgba(12, 16, 24, 0.55)',
                            borderColor: 'rgba(255, 255, 255, 0.14)',
                            boxShadow: `0 8px 24px -6px rgba(0, 0, 0, 0.45), inset 0 1.5px 0.5px rgba(255, 255, 255, 0.38), inset 0 -1px 1px rgba(0, 0, 0, 0.4), inset 0 0 20px -4px rgba(${theme.glowPrimary}, 0.15), inset 1px 0 0 rgba(255, 255, 255, 0.1)`,
                          }}
                        >
                          {/* Top Specular Stripe */}
                          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

                          {/* Sliders */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                            {/* Brightness */}
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                                <span className="flex items-center gap-1.5 text-zinc-400 uppercase text-[10px] tracking-wider">
                                  <Sun size={12} style={{ color: `rgb(${theme.glowPrimary})` }} /> Brightness
                                </span>
                                <span className="font-mono text-[11px]" style={{ color: `rgb(${theme.glowPrimary})` }}>
                                  {Math.round(brightness * 100)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                aria-label="Wallpaper brightness"
                                min="0.2"
                                max="1.0"
                                step="0.05"
                                value={brightness}
                                onChange={(e) => setBrightness?.(parseFloat(e.target.value))}
                                className="w-full cursor-pointer h-1.5 bg-white/10 rounded-lg"
                                style={{ accentColor: `rgb(${theme.glowPrimary})` }}
                              />
                            </div>

                            {/* Blur */}
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                                <span className="flex items-center gap-1.5 text-zinc-400 uppercase text-[10px] tracking-wider">
                                  <Sliders size={12} style={{ color: `rgb(${theme.glowPrimary})` }} /> Ambient Blur
                                </span>
                                <span className="font-mono text-[11px]" style={{ color: `rgb(${theme.glowPrimary})` }}>
                                  {blur}px
                                </span>
                              </div>
                              <input
                                type="range"
                                aria-label="Wallpaper blur"
                                min="0"
                                max="16"
                                step="1"
                                value={blur}
                                onChange={(e) => setBlur?.(parseInt(e.target.value, 10))}
                                className="w-full cursor-pointer h-1.5 bg-white/10 rounded-lg"
                                style={{ accentColor: `rgb(${theme.glowPrimary})` }}
                              />
                            </div>
                          </div>

                          {/* Accent Swatches */}
                          <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5 relative z-10">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                              <Palette size={11} style={{ color: `rgb(${theme.glowPrimary})` }} /> UI Neon Accent
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              {ACCENT_SWATCHES.map((swatch) => {
                                const isSelected = customAccent === swatch.id;
                                const isAuto = swatch.id === 'auto';
                                const dynamicAutoColor = wallpaperTheme?.glowPrimary
                                  ? `rgb(${wallpaperTheme.glowPrimary})`
                                  : `rgb(${theme.glowPrimary})`;
                                const swatchColor = isAuto ? dynamicAutoColor : swatch.color;
                                const swatchBorder = isAuto ? dynamicAutoColor : swatch.border;

                                return (
                                  <button
                                    key={swatch.id}
                                    onClick={() => setCustomAccent?.(swatch.id)}
                                    style={
                                      isSelected
                                        ? {
                                            background: `linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.05) 100%), rgba(20, 24, 36, 0.75)`,
                                            borderColor: 'rgba(255, 255, 255, 0.45)',
                                            boxShadow: `0 0 16px ${swatchBorder}50, inset 0 1.5px 0.5px rgba(255, 255, 255, 0.5), inset 0 -1px 1px rgba(0, 0, 0, 0.4)`,
                                          }
                                        : {
                                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(0, 0, 0, 0.25) 100%), rgba(12, 16, 24, 0.5)',
                                            borderColor: 'rgba(255, 255, 255, 0.1)',
                                            boxShadow: 'inset 0 1px 0.5px rgba(255, 255, 255, 0.25), inset 0 -1px 0 rgba(0, 0, 0, 0.3)',
                                          }
                                    }
                                    className={`relative overflow-hidden flex items-center justify-between px-2 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all cursor-pointer border ${
                                      isSelected
                                        ? 'text-white'
                                        : 'text-zinc-400 hover:text-white hover:border-white/20 hover:scale-[1.02]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span
                                        className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                                        style={{
                                          backgroundColor: swatchColor,
                                          boxShadow: isSelected ? `0 0 8px ${swatchBorder}` : 'none',
                                        }}
                                      />
                                      <span className="truncate">{swatch.label}</span>
                                    </div>
                                    {isSelected && (
                                      <Check size={10} style={{ color: swatchBorder }} />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Bottom Row: Curated Presets */}
                      <div className="flex flex-col gap-2 pt-2 border-t border-white/5 relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                          <Sparkles size={11} style={{ color: `rgb(${theme.glowPrimary})` }} /> Curated Presets
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {CURATED_WALLPAPERS.map((preset) => {
                            const isCuratedActive = wallpaperUrl === preset.url;
                            return (
                              <button
                                key={preset.id}
                                onClick={() => {
                                  selectCuratedWallpaper?.(preset);
                                  selectTheme(-1);
                                }}
                                className={`relative h-14 sm:h-16 rounded-xl overflow-hidden border text-left transition-all group cursor-pointer ${
                                  isCuratedActive
                                    ? 'scale-[1.02]'
                                    : 'border-white/15 hover:border-white/40 opacity-80 hover:opacity-100'
                                }`}
                                style={
                                  isCuratedActive
                                    ? {
                                        borderColor: `rgb(${theme.glowPrimary})`,
                                        boxShadow: `0 0 24px rgba(${theme.glowPrimary}, 0.5), inset 0 1.5px 0.5px rgba(255, 255, 255, 0.65), inset 0 -1px 1px rgba(0, 0, 0, 0.5)`,
                                      }
                                    : {
                                        boxShadow: 'inset 0 1.5px 0.5px rgba(255, 255, 255, 0.35), inset 0 -1px 1px rgba(0, 0, 0, 0.4), 0 4px 14px rgba(0, 0, 0, 0.3)',
                                      }
                                }
                              >
                                <div
                                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                  style={{ backgroundImage: `url(${preset.thumbnail})` }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
                                <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-white truncate drop-shadow-md">
                                    {preset.name}
                                  </span>
                                  {isCuratedActive && (
                                    <Check size={11} style={{ color: `rgb(${theme.glowPrimary})` }} className="shrink-0" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  )}
                </div>

                {/* ── Display Scaling & UI Zoom ── */}
                <div
                  onMouseMove={handleGlassMouseMove}
                  className="p-5 rounded-2xl border backdrop-blur-2xl relative overflow-hidden transition-all duration-300 group"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.025) 35%, rgba(0, 0, 0, 0.35) 100%), rgba(14, 18, 28, 0.6)',
                    borderColor: `rgba(${theme.glowPrimary}, 0.4)`,
                    boxShadow: `0 24px 60px -12px rgba(0, 0, 0, 0.7), inset 0 1.5px 0.5px 0 rgba(255, 255, 255, 0.65), inset 0 -1.5px 1px 0 rgba(0, 0, 0, 0.6), inset 0 0 36px -6px rgba(${theme.glowPrimary}, 0.28), inset 1px 0 0 rgba(255, 255, 255, 0.14), inset -1px 0 0 rgba(255, 255, 255, 0.07)`,
                  }}
                >
                  {/* Top Specular Chromatic Dispersion Glint Stripe */}
                  <div
                    className="absolute top-0 inset-x-0 h-[1.5px] pointer-events-none z-20"
                    style={{
                      background: `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.15) 15%, rgba(255, 255, 255, 0.95) 45%, rgba(${theme.glowPrimary}, 0.85) 65%, rgba(255, 255, 255, 0.3) 85%, transparent 100%)`,
                    }}
                  />

                  {/* Dynamic Pointer Specular Refraction Glint */}
                  <div
                    className="absolute inset-0 pointer-events-none rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'radial-gradient(circle 320px at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 255, 255, 0.12), transparent 70%)',
                    }}
                  />

                  {/* Diagonal Specular Caustic Sheen */}
                  <div
                    className="absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 28%, transparent 55%, rgba(255, 255, 255, 0.04) 100%)',
                    }}
                  />

                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4 relative z-10">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="p-2 rounded-xl border shadow-sm"
                        style={{
                          backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                          borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                          color: `rgb(${theme.glowPrimary})`,
                        }}
                      >
                        <Monitor size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-2">
                          Display Scaling & In-App Zoom
                        </h4>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Scale viewport & typography independently of your OS or browser zoom.
                        </p>
                      </div>
                    </div>

                    {/* Live detected OS DPI indicator chip & Reset */}
                    <div className="flex items-center gap-2">
                      <div
                        className="px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-[10px] font-mono shadow-sm"
                        style={{
                          backgroundColor: `rgba(${theme.glowPrimary}, 0.08)`,
                          borderColor: `rgba(${theme.glowPrimary}, 0.25)`,
                          color: `rgb(${theme.glowPrimary})`,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full animate-pulse"
                          style={{ backgroundColor: `rgb(${theme.glowPrimary})` }}
                        />
                        <span>OS DPI: {detectedOsScalePercent}%</span>
                        {counteractDpi && detectedOsScalePercent > 100 && (
                          <span className="text-emerald-400 font-bold ml-1">→ 1:1 ACTIVE</span>
                        )}
                      </div>

                      {(displayScale !== 100 || counteractDpi) && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={resetDisplayScale}
                          className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                          title="Reset display scale to 100%"
                        >
                          <RotateCcw size={10} /> Reset
                        </motion.button>
                      )}
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-2 mb-4 relative z-10">
                    {DISPLAY_SCALE_PRESETS.map((preset) => {
                      const isSelected = displayScale === preset;
                      return (
                        <motion.button
                          key={preset}
                          whileHover={{ scale: 1.04, y: -1 }}
                          whileTap={{ scale: 0.96 }}
                          transition={springSnappy}
                          onClick={() => setDisplayScale(preset)}
                          style={
                            isSelected
                              ? {
                                  borderColor: `rgba(${theme.glowPrimary}, 0.75)`,
                                  background: `linear-gradient(135deg, rgba(${theme.glowPrimary}, 0.3) 0%, rgba(${theme.glowPrimary}, 0.1) 100%), rgba(16, 20, 32, 0.72)`,
                                  color: '#ffffff',
                                  boxShadow: `0 0 20px rgba(${theme.glowPrimary}, 0.35), inset 0 1.5px 0.5px rgba(255, 255, 255, 0.6), inset 0 -1px 1px rgba(0, 0, 0, 0.5)`,
                                }
                              : {
                                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0.25) 100%), rgba(12, 16, 24, 0.5)',
                                  borderColor: 'rgba(255, 255, 255, 0.12)',
                                  boxShadow: 'inset 0 1.5px 0.5px rgba(255, 255, 255, 0.3), inset 0 -1px 1px rgba(0, 0, 0, 0.3)',
                                }
                          }
                          className={`relative overflow-hidden px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? ''
                              : 'text-zinc-400 hover:border-white/25 hover:text-white'
                          }`}
                        >
                          {preset}%{preset === 100 ? ' (Default)' : ''}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Range Slider & Fine Tuner */}
                  <div className="space-y-2 mb-4 pt-3 border-t border-white/5 relative z-10">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-400 text-[11px] font-bold tracking-wider uppercase">Fine-Tune Scale</span>
                      <span
                        className="font-bold px-2 py-0.5 rounded-lg border text-xs shadow-sm"
                        style={{
                          borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                          backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                          color: `rgb(${theme.glowPrimary})`,
                        }}
                      >
                        {displayScale}% ({effectiveZoom}x effective)
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-zinc-500">{MIN_DISPLAY_SCALE}%</span>
                      <input
                        type="range"
                        aria-label="In-app display scale"
                        min={MIN_DISPLAY_SCALE}
                        max={MAX_DISPLAY_SCALE}
                        step={5}
                        value={displayScale}
                        onChange={(e) => setDisplayScale(Number(e.target.value))}
                        className="flex-1 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                        style={{
                          accentColor: `rgb(${theme.glowPrimary})`,
                        }}
                      />
                      <span className="text-[10px] font-mono text-zinc-500">{MAX_DISPLAY_SCALE}%</span>
                    </div>
                  </div>

                  {/* Counteract OS DPI Scaling 1:1 Mode Toggle */}
                  <div
                    role="switch"
                    tabIndex={0}
                    aria-checked={counteractDpi}
                    aria-label="Counteract OS DPI scaling"
                    onClick={() => setCounteractDpi(!counteractDpi)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setCounteractDpi(!counteractDpi);
                      }
                    }}
                    className={`relative z-10 flex w-full items-center justify-between overflow-hidden rounded-xl border p-3.5 text-left transition-all cursor-pointer select-none backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080a12] ${
                      counteractDpi
                        ? 'border-emerald-500/50 bg-emerald-500/15 shadow-[0_0_24px_rgba(16,185,129,0.25),inset_0_1.5px_0.5px_rgba(255,255,255,0.45),inset_0_-1px_1px_rgba(0,0,0,0.5)]'
                        : 'border-white/12 hover:border-white/25'
                    }`}
                    style={!counteractDpi ? {
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(0, 0, 0, 0.25) 100%), rgba(12, 16, 24, 0.52)',
                      boxShadow: 'inset 0 1.5px 0.5px rgba(255, 255, 255, 0.3), inset 0 -1px 1px rgba(0, 0, 0, 0.4)',
                    } : undefined}
                  >
                    {/* Top Specular Line */}
                    <div
                      className="absolute top-0 inset-x-0 h-[1.5px] pointer-events-none"
                      style={{
                        background: counteractDpi
                          ? 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.7) 50%, rgba(52, 211, 153, 0.8) 75%, transparent 100%)'
                          : 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
                      }}
                    />
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg border ${
                          counteractDpi ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/10 text-zinc-400'
                        }`}
                      >
                        <Zap size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>Counteract OS DPI Scaling (1:1 Native Resolution)</span>
                          {detectedOsScalePercent > 100 && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-zinc-300">
                              Windows {detectedOsScalePercent}% detected
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {detectedOsScalePercent > 100
                            ? `Neutralizes your OS ${detectedOsScalePercent}% zoom so TypeNova renders at ultra-crisp 1:1 hardware pixels.`
                            : 'Ensures 1:1 pixel rendering if running on high-DPI or scaled displays.'}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${
                        counteractDpi ? 'bg-emerald-500' : 'bg-white/15'
                      }`}
                    >
                      <motion.div
                        animate={{ x: counteractDpi ? 20 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="w-4 h-4 rounded-full bg-white shadow-md"
                      />
                    </div>
                  </div>
                </div>

                {/* Typography Studio — Master Stage & Minimalist Font Picker */}
                <div className="space-y-4">
                  {/* Top Bar: Section Title */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-200 tracking-wider uppercase flex items-center gap-2">
                      <Type size={14} style={{ color: `rgb(${theme.glowPrimary})` }} /> Typography Studio
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400">
                      {filteredFonts.length} of {FONT_SPECIMENS.length} Typefaces
                    </span>
                  </div>

                  {/* Master Showcase Stage (Typeface Playground) */}
                  <div
                    className="relative overflow-hidden rounded-3xl border bg-black/50 p-5 sm:p-6 backdrop-blur-2xl shadow-2xl transition-all"
                    style={{
                      borderColor: `rgba(${theme.glowPrimary}, 0.25)`,
                      boxShadow: `0 12px 40px -10px rgba(0, 0, 0, 0.7), 0 0 30px rgba(${theme.glowPrimary}, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.15)`,
                    }}
                  >
                    {/* Top Specular Glint Line */}
                    <div
                      className="absolute top-0 inset-x-0 h-[1.5px] pointer-events-none"
                      style={{
                        background: `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.7) 40%, rgba(${theme.glowPrimary}, 0.8) 70%, transparent 100%)`,
                      }}
                    />

                    {/* Stage Header: Font Identity + Badges + Actions */}
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h4
                            className="text-xl sm:text-2xl font-black text-white tracking-tight"
                            style={{ fontFamily: `"${activeSpecimen.name}", monospace` }}
                          >
                            {activeSpecimen.name}
                          </h4>
                          <span
                            className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 tracking-wider"
                            style={{
                              borderColor: `rgba(${theme.glowPrimary}, 0.45)`,
                              backgroundColor: `rgba(${theme.glowPrimary}, 0.18)`,
                              color: `rgb(${theme.glowPrimary})`,
                            }}
                          >
                            {activeSpecimen.badge}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider hidden sm:inline-block">
                            {activeSpecimen.tag}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1.5 max-w-xl leading-relaxed">
                          {activeSpecimen.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {themeFont !== 'JetBrains Mono' && (
                          <button
                            type="button"
                            onClick={() => setThemeFont('JetBrains Mono')}
                            className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                            title="Reset to JetBrains Mono default"
                          >
                            <RotateCcw size={11} /> Reset Default
                          </button>
                        )}
                        <div
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-mono backdrop-blur-md"
                          style={{
                            borderColor: `rgba(${theme.glowPrimary}, 0.45)`,
                            backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                            color: `rgb(${theme.glowPrimary})`,
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: `rgb(${theme.glowPrimary})` }} />
                          <span className="font-bold">ACTIVE TYPEFACE</span>
                        </div>
                      </div>
                    </div>

                    {/* Minimalist Monkeytype Control Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md mb-4">
                      {/* Presets */}
                      <div className="flex items-center gap-1">
                        {(['signature', 'code', 'prose', 'ligatures', 'glyphs'] as const).map(presetKey => {
                          const isPresetActive = fontPreset === presetKey && !fontTestText;
                          return (
                            <button
                              key={presetKey}
                              type="button"
                              onClick={() => {
                                setFontPreset(presetKey);
                                setFontTestText('');
                              }}
                              className={`text-[11px] px-2.5 py-1 rounded-lg transition-all capitalize cursor-pointer ${
                                isPresetActive
                                  ? 'border font-semibold shadow-sm'
                                  : 'text-zinc-400 hover:text-zinc-200 bg-white/[0.02] border border-white/5'
                              }`}
                              style={
                                isPresetActive
                                  ? {
                                      borderColor: `rgba(${theme.glowPrimary}, 0.5)`,
                                      backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                                      color: `rgb(${theme.glowPrimary})`,
                                    }
                                  : undefined
                              }
                            >
                              {presetKey}
                            </button>
                          );
                        })}
                      </div>

                      <div className="w-1.5 h-1.5 rounded-full bg-white/10 hidden md:inline-block" />

                      {/* Font Size Selector */}
                      <div className="flex items-center gap-1">
                        {([14, 18, 22] as const).map(size => {
                          const isSizeActive = fontSizePreset === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setFontSizePreset(size)}
                              className={`text-[11px] font-mono px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                                isSizeActive
                                  ? 'border font-bold'
                                  : 'text-zinc-400 hover:text-zinc-200 bg-white/[0.02] border border-white/5'
                              }`}
                              style={
                                isSizeActive
                                  ? {
                                      borderColor: `rgba(${theme.glowPrimary}, 0.5)`,
                                      backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                                      color: `rgb(${theme.glowPrimary})`,
                                    }
                                  : undefined
                              }
                            >
                              {size}px
                            </button>
                          );
                        })}
                      </div>

                      <div className="w-1.5 h-1.5 rounded-full bg-white/10 hidden md:inline-block" />

                      {/* Live Custom Keystroke Preview Input */}
                      <div className="flex-1 min-w-[200px] relative">
                        <Terminal size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                        <input
                          type="text"
                          value={fontTestText}
                          onChange={e => setFontTestText(e.target.value)}
                          placeholder="Type custom test phrase..."
                          className="w-full pl-7 pr-7 py-1 text-xs rounded-xl bg-white/[0.04] border border-white/10 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-white/30 transition-all font-mono"
                        />
                        {fontTestText && (
                          <button
                            type="button"
                            onClick={() => setFontTestText('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                            title="Clear preview text"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Master Typing Canvas Stage */}
                    <div
                      className="p-5 sm:p-6 rounded-2xl border border-white/10 relative overflow-hidden backdrop-blur-xl"
                      style={{
                        background: 'linear-gradient(180deg, rgba(4, 6, 12, 0.85) 0%, rgba(8, 11, 20, 0.95) 100%)',
                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8), inset 0 -1px 0 rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <div
                        className="text-white font-medium break-all sm:break-normal transition-all"
                        style={{
                          fontFamily: `"${activeSpecimen.name}", monospace`,
                          fontSize: `${fontSizePreset}px`,
                          lineHeight: 1.6,
                          letterSpacing: '0.02em',
                        }}
                      >
                        {(() => {
                          if (fontTestText.trim()) return fontTestText;
                          if (fontPreset === 'code') return FONT_PRESET_SAMPLES.code;
                          if (fontPreset === 'prose') return FONT_PRESET_SAMPLES.prose;
                          if (fontPreset === 'ligatures') return FONT_PRESET_SAMPLES.ligatures;
                          if (fontPreset === 'glyphs') return FONT_PRESET_SAMPLES.glyphs;
                          return activeSpecimen.sample;
                        })()}
                        <span
                          className="inline-block w-2 h-4 sm:h-5 ml-1 align-middle animate-pulse rounded-sm"
                          style={{ backgroundColor: `rgb(${theme.glowPrimary})` }}
                        />
                      </div>

                      {/* Sub-strip: Glyphs & Ligature Inspection */}
                      <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 font-mono">
                        <div
                          className="flex items-center gap-3 text-zinc-400"
                          style={{ fontFamily: `"${activeSpecimen.name}", monospace` }}
                        >
                          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-sans">Glyph Map:</span>
                          <span>{activeSpecimen.glyphs}</span>
                        </div>
                        <div
                          className="flex items-center gap-2 text-zinc-400"
                          style={{ fontFamily: `"${activeSpecimen.name}", monospace` }}
                        >
                          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-sans">Numerals:</span>
                          <span>0123456789</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Category Filter Pills & Counter */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      {FONT_CATEGORIES.map(cat => {
                        const isSelected = fontCategory === cat.id;
                        const count = cat.id === 'all'
                          ? FONT_SPECIMENS.length
                          : FONT_SPECIMENS.filter(s => s.category === cat.id).length;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setFontCategory(cat.id)}
                            className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all duration-150 shrink-0 flex items-center gap-1.5 select-none cursor-pointer ${
                              isSelected
                                ? 'border shadow-sm font-semibold'
                                : 'border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                            }`}
                            style={
                              isSelected
                                ? {
                                    borderColor: `rgba(${theme.glowPrimary}, 0.6)`,
                                    backgroundColor: `rgba(${theme.glowPrimary}, 0.16)`,
                                    color: `rgb(${theme.glowPrimary})`,
                                  }
                                : undefined
                            }
                          >
                            <span>{cat.label}</span>
                            <span
                              className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold"
                              style={
                                isSelected
                                  ? { backgroundColor: `rgba(${theme.glowPrimary}, 0.25)`, color: `rgb(${theme.glowPrimary})` }
                                  : { backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#a1a1aa' }
                              }
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline-block">
                      {filteredFonts.length} of {FONT_SPECIMENS.length} Typefaces
                    </span>
                  </div>

                  {/* Streamlined Minimalist Font Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                    {filteredFonts.map((specimen, sIdx) => {
                      const isActive = specimen.name === themeFont;
                      return (
                        <motion.button
                          key={specimen.name}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ ...springFluid, delay: Math.min(sIdx * 0.015, 0.2) }}
                          whileHover={{ scale: 1.015, y: -1 }}
                          whileTap={{ scale: 0.985 }}
                          onClick={() => setThemeFont(specimen.name)}
                          style={
                            isActive
                              ? {
                                  borderColor: `rgba(${theme.glowPrimary}, 0.75)`,
                                  background: `linear-gradient(135deg, rgba(${theme.glowPrimary}, 0.2) 0%, rgba(${theme.glowPrimary}, 0.06) 60%, rgba(0, 0, 0, 0.4) 100%), rgba(14, 18, 30, 0.8)`,
                                  boxShadow: `0 0 24px rgba(${theme.glowPrimary}, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 0 16px rgba(${theme.glowPrimary}, 0.15)`,
                                }
                              : {
                                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%), rgba(12, 16, 24, 0.6)',
                                  borderColor: 'rgba(255, 255, 255, 0.08)',
                                  boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                                }
                          }
                          className={`group relative p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden select-none backdrop-blur-xl ${
                            isActive ? 'border' : 'hover:border-white/20 hover:bg-white/[0.04]'
                          }`}
                        >
                          {/* Top Specular Glint */}
                          <div
                            className="absolute top-0 inset-x-0 h-[1px] pointer-events-none"
                            style={{
                              background: isActive
                                ? `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.8) 50%, rgba(${theme.glowPrimary}, 0.8) 75%, transparent 100%)`
                                : 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.25) 50%, transparent 100%)',
                            }}
                          />

                          {/* Card Top: Font Name + Badge / Check */}
                          <div className="flex items-center justify-between gap-1.5 mb-1.5 relative z-10">
                            <span
                              className={`text-xs font-bold tracking-tight truncate ${
                                isActive ? 'text-white' : 'text-zinc-200 group-hover:text-white'
                              }`}
                              style={{ fontFamily: `"${specimen.name}", monospace` }}
                            >
                              {specimen.name}
                            </span>
                            {isActive ? (
                              <span
                                className="flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor: `rgba(${theme.glowPrimary}, 0.25)`,
                                  color: `rgb(${theme.glowPrimary})`,
                                  border: `1px solid rgba(${theme.glowPrimary}, 0.5)`,
                                }}
                              >
                                <Check size={10} /> ACTIVE
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border border-white/8 bg-white/4 text-zinc-400 shrink-0">
                                {specimen.badge}
                              </span>
                            )}
                          </div>

                          {/* Card Middle: Micro-specimen single line in this font */}
                          <div
                            className="text-[11px] text-zinc-400 group-hover:text-zinc-200 truncate py-1 relative z-10"
                            style={{ fontFamily: `"${specimen.name}", monospace` }}
                          >
                            {specimen.sample}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Sound Profile Section — Tactile Switch Cards */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-zinc-300 tracking-wider uppercase flex items-center gap-2">
                      <Volume2 size={14} style={{ color: `rgb(${theme.glowPrimary})` }} /> Keystroke Switch Acoustics
                    </h4>
                    <span className="text-[10px] font-mono text-zinc-400">
                      ACTIVE: {soundProfile.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3.5">
                    {SOUND_PROFILES.map((profile, pIdx) => {
                      const isActive = profile.key === soundProfile;
                      const isPlaying = playingSwitch === profile.key;
                      return (
                        <motion.button
                          key={profile.key}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ ...springFluid, delay: pIdx * 0.025 }}
                          whileHover={{ scale: 1.025, y: -3 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => triggerSoundPreview(profile.key)}
                          style={
                            isActive
                              ? {
                                  borderColor: `rgba(${theme.glowPrimary}, 0.75)`,
                                  background: `linear-gradient(135deg, rgba(${theme.glowPrimary}, 0.28) 0%, rgba(${theme.glowPrimary}, 0.09) 50%, rgba(0, 0, 0, 0.35) 100%), rgba(16, 20, 32, 0.72)`,
                                  boxShadow: `0 0 28px rgba(${theme.glowPrimary}, 0.4), inset 0 1.5px 0.5px 0 rgba(255, 255, 255, 0.65), inset 0 -1.5px 1px 0 rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(${theme.glowPrimary}, 0.25), inset 1px 0 0 rgba(255, 255, 255, 0.15)`,
                                }
                              : {
                                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.02) 40%, rgba(0, 0, 0, 0.3) 100%), rgba(14, 18, 28, 0.55)',
                                  borderColor: 'rgba(255, 255, 255, 0.12)',
                                  boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.4), inset 0 1.5px 0.5px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.4), inset 1px 0 0 rgba(255, 255, 255, 0.08), inset -1px 0 0 rgba(255, 255, 255, 0.04)',
                                }
                          }
                          className={`group relative p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden select-none backdrop-blur-xl ${
                            isActive
                              ? 'border'
                              : 'hover:border-white/25 hover:scale-[1.02]'
                          }`}
                        >
                          {/* Top Specular Glint Line */}
                          <div
                            className="absolute top-0 inset-x-0 h-[1.5px] pointer-events-none"
                            style={{
                              background: isActive
                                ? `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.85) 50%, rgba(${theme.glowPrimary}, 0.8) 75%, transparent 100%)`
                                : 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
                            }}
                          />
                          <div className="relative z-10">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className={`text-xs font-black tracking-wide uppercase ${isActive ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                                {profile.label}
                              </span>
                              <span
                                className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0"
                                style={
                                  isActive
                                    ? {
                                        borderColor: `rgba(${theme.glowPrimary}, 0.4)`,
                                        backgroundColor: `rgba(${theme.glowPrimary}, 0.2)`,
                                        color: `rgb(${theme.glowPrimary})`,
                                      }
                                    : {
                                        borderColor: 'rgba(255, 255, 255, 0.08)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                        color: '#a1a1aa',
                                      }
                                }
                              >
                                {profile.switchType}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-snug">
                              {profile.soundDesc}
                            </p>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono relative z-10">
                            <span
                              className="font-bold flex items-center gap-1.5 transition-colors"
                              style={{ color: isPlaying || isActive ? `rgb(${theme.glowPrimary})` : '#71717a' }}
                            >
                              {isPlaying ? (
                                <div className="flex items-center gap-0.5 h-3 px-0.5">
                                  {[0.1, 0.3, 0.2, 0.4].map((del, i) => (
                                    <motion.span
                                      key={i}
                                      animate={{ height: ['25%', '100%', '35%', '85%', '25%'] }}
                                      transition={{ repeat: Infinity, duration: 0.5, delay: del, ease: "easeInOut" }}
                                      className="w-0.5 rounded-full"
                                      style={{ backgroundColor: `rgb(${theme.glowPrimary})` }}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <Play size={10} className="fill-current" />
                              )}
                              {isPlaying ? 'PLAYING...' : 'Test Audio'}
                            </span>
                            {isActive && (
                              <span
                                className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: `rgba(${theme.glowPrimary}, 0.25)`,
                                  color: `rgb(${theme.glowPrimary})`,
                                }}
                              >
                                SELECTED
                              </span>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* ── LIVE INTERACTIVE TYPING SANDBOX ── */}
                <div
                  onMouseMove={handleGlassMouseMove}
                  className="p-6 rounded-2xl border backdrop-blur-2xl relative overflow-hidden transition-all duration-300 group"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.11) 0%, rgba(255, 255, 255, 0.025) 35%, rgba(0, 0, 0, 0.35) 100%), rgba(14, 18, 28, 0.6)',
                    borderColor: isTypingSandbox ? `rgba(${theme.glowPrimary}, 0.7)` : `rgba(${theme.glowPrimary}, 0.35)`,
                    boxShadow: isTypingSandbox
                      ? `0 24px 60px -12px rgba(0, 0, 0, 0.75), 0 0 35px rgba(${theme.glowPrimary}, 0.3), inset 0 1.5px 0.5px 0 rgba(255, 255, 255, 0.65), inset 0 -1.5px 1px 0 rgba(0, 0, 0, 0.6), inset 0 0 35px -4px rgba(${theme.glowPrimary}, 0.3), inset 1px 0 0 rgba(255, 255, 255, 0.14), inset -1px 0 0 rgba(255, 255, 255, 0.07)`
                      : `0 24px 60px -12px rgba(0, 0, 0, 0.65), inset 0 1.5px 0.5px 0 rgba(255, 255, 255, 0.6), inset 0 -1.5px 1px 0 rgba(0, 0, 0, 0.6), inset 0 0 32px -6px rgba(${theme.glowPrimary}, 0.2), inset 1px 0 0 rgba(255, 255, 255, 0.14), inset -1px 0 0 rgba(255, 255, 255, 0.07)`,
                  }}
                >
                  {/* Top Specular Chromatic Dispersion Glint Stripe */}
                  <div
                    className="absolute top-0 inset-x-0 h-[1.5px] pointer-events-none z-20"
                    style={{
                      background: `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.15) 15%, rgba(255, 255, 255, 0.95) 45%, rgba(${theme.glowPrimary}, 0.85) 65%, rgba(255, 255, 255, 0.3) 85%, transparent 100%)`,
                    }}
                  />

                  {/* Dynamic Pointer Specular Refraction Glint */}
                  <div
                    className="absolute inset-0 pointer-events-none rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'radial-gradient(circle 320px at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 255, 255, 0.12), transparent 70%)',
                    }}
                  />

                  {/* Diagonal Specular Caustic Sheen */}
                  <div
                    className="absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 28%, transparent 55%, rgba(255, 255, 255, 0.04) 100%)',
                    }}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5 relative z-10">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full animate-pulse shadow-sm"
                        style={{
                          backgroundColor: `rgb(${theme.glowPrimary})`,
                          boxShadow: `0 0 10px rgb(${theme.glowPrimary})`,
                        }}
                      />
                      <h4 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-2">
                        Live Typing Sandbox
                      </h4>
                      {/* Dynamic Audio Ripple Bars while typing */}
                      <div className="flex items-center gap-0.5 h-3.5 px-1">
                        {[0.15, 0.05, 0.25, 0.1, 0.3].map((del, i) => (
                          <motion.span
                            key={i}
                            animate={isTypingSandbox ? { height: ['20%', '100%', '30%', '85%', '20%'] } : { height: '25%' }}
                            transition={isTypingSandbox ? { repeat: Infinity, duration: 0.35, delay: del, ease: "easeInOut" } : { duration: 0.2 }}
                            className="w-0.5 rounded-full transition-all"
                            style={{
                              backgroundColor: isTypingSandbox ? `rgb(${theme.glowPrimary})` : 'rgba(255,255,255,0.2)',
                              boxShadow: isTypingSandbox ? `0 0 6px rgba(${theme.glowPrimary}, 0.6)` : 'none',
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
                        • Test font ({themeFont}) & switch ({soundProfile})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {sandboxWpm > 0 && (
                        <motion.span
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={springSnappy}
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border"
                          style={{
                            borderColor: `rgba(${theme.glowPrimary}, 0.4)`,
                            backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                            color: `rgb(${theme.glowPrimary})`,
                          }}
                        >
                          {sandboxWpm} WPM
                        </motion.span>
                      )}
                      {sandboxInput.length > 0 && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleClearSandbox}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[10px] font-mono transition-colors flex items-center gap-1 cursor-pointer"
                          title="Clear sandbox"
                        >
                          <RotateCcw size={10} /> CLEAR
                        </motion.button>
                      )}
                    </div>
                  </div>

                  <div className="relative group z-10">
                    <input
                      type="text"
                      value={sandboxInput}
                      onChange={handleSandboxChange}
                      placeholder="Tap your keyboard here to test switch acoustics, ligatures & theme glow in real time..."
                      style={{
                        fontFamily: `"${themeFont}", monospace`,
                        color: '#ffffff',
                        background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.65) 0%, rgba(10, 12, 18, 0.75) 100%)',
                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.7), inset 0 -1px 0 rgba(255, 255, 255, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.08)',
                      }}
                      className="w-full px-5 py-4 rounded-2xl border border-white/10 focus:border-white/35 focus:outline-none text-sm placeholder:text-zinc-500 transition-all font-medium backdrop-blur-md"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-3 text-[10px] font-mono text-zinc-400 relative z-10">
                    <span className="flex items-center gap-2">
                      <span>KEYSTROKES: {sandboxInput.length}</span>
                      {isTypingSandbox && (
                        <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: `rgb(${theme.glowPrimary})` }} />
                      )}
                    </span>
                    <span className="italic">Type any keys to preview real mechanical audio</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'shaders' && (
              <div className="space-y-6">
                {/* Shader Preset Selector */}
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 tracking-wider uppercase mb-3 flex items-center gap-2">
                    <Sparkles size={14} style={{ color: `rgb(${theme.glowPrimary})` }} /> Shader Visualizer Mode
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    {SHADER_MODES.map((item, mIdx) => {
                      const isActive = shaderConfig.mode === item.id;
                      return (
                        <motion.button
                          key={item.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ ...springFluid, delay: mIdx * 0.02 }}
                          whileHover={{ scale: 1.025, y: -3 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => shaderConfig.setMode(item.id)}
                          style={
                            isActive
                              ? {
                                  borderColor: `rgba(${theme.glowPrimary}, 0.75)`,
                                  background: `linear-gradient(135deg, rgba(${theme.glowPrimary}, 0.28) 0%, rgba(${theme.glowPrimary}, 0.09) 50%, rgba(0, 0, 0, 0.35) 100%), rgba(16, 20, 32, 0.72)`,
                                  boxShadow: `0 0 28px rgba(${theme.glowPrimary}, 0.4), inset 0 1.5px 0.5px 0 rgba(255, 255, 255, 0.65), inset 0 -1.5px 1px 0 rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(${theme.glowPrimary}, 0.25), inset 1px 0 0 rgba(255, 255, 255, 0.15)`,
                                }
                              : {
                                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.02) 40%, rgba(0, 0, 0, 0.3) 100%), rgba(14, 18, 28, 0.55)',
                                  borderColor: 'rgba(255, 255, 255, 0.12)',
                                  boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.4), inset 0 1.5px 0.5px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.4), inset 1px 0 0 rgba(255, 255, 255, 0.08), inset -1px 0 0 rgba(255, 255, 255, 0.04)',
                                }
                          }
                          className={`relative overflow-hidden flex flex-col text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none backdrop-blur-xl ${
                            isActive
                              ? 'text-white border'
                              : 'hover:border-white/25 text-zinc-400 hover:text-zinc-200 hover:scale-[1.02]'
                          }`}
                        >
                          {/* Top Specular Glint Line */}
                          <div
                            className="absolute top-0 inset-x-0 h-[1.5px] pointer-events-none"
                            style={{
                              background: isActive
                                ? `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.85) 50%, rgba(${theme.glowPrimary}, 0.8) 75%, transparent 100%)`
                                : 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
                            }}
                          />
                          <div className="flex items-center justify-between mb-1.5 relative z-10">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0"
                                style={isActive ? { color: `rgb(${theme.glowPrimary})`, borderColor: `rgba(${theme.glowPrimary}, 0.3)` } : undefined}
                              >
                                {item.id === 'liquid' ? <Waves size={13} style={isActive ? { color: `rgb(${theme.glowPrimary})` } : undefined} className={isActive ? '' : 'text-zinc-400'} /> :
                                 item.id === 'aurora' ? <Sparkles size={13} style={isActive ? { color: `rgb(${theme.glowPrimary})` } : undefined} className={isActive ? '' : 'text-zinc-400'} /> :
                                 item.id === 'grid' ? <LayoutGrid size={13} style={isActive ? { color: `rgb(${theme.glowPrimary})` } : undefined} className={isActive ? '' : 'text-zinc-400'} /> :
                                 item.id === 'matrix' ? <Terminal size={13} style={isActive ? { color: `rgb(${theme.glowPrimary})` } : undefined} className={isActive ? '' : 'text-zinc-400'} /> :
                                 item.id === 'nebula' ? <CloudFog size={13} style={isActive ? { color: `rgb(${theme.glowPrimary})` } : undefined} className={isActive ? '' : 'text-zinc-400'} /> :
                                 <Moon size={13} className="text-zinc-400" />}
                              </span>
                              <span className="text-xs font-bold tracking-wide text-white">{item.name}</span>
                            </div>
                            {isActive && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={springSnappy}
                              >
                                <Check
                                  size={14}
                                  className="shrink-0"
                                  style={{ color: `rgb(${theme.glowPrimary})` }}
                                />
                              </motion.div>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2 relative z-10">
                            {item.desc}
                          </p>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Shader Speed & Interactivity Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                  {/* Speed Selector */}
                  <div
                    className="flex flex-col p-5 rounded-2xl border backdrop-blur-2xl justify-between gap-3 relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.02) 40%, rgba(0, 0, 0, 0.4) 100%), rgba(14, 18, 28, 0.6)',
                      borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                      boxShadow: `0 20px 45px -10px rgba(0, 0, 0, 0.6), inset 0 1.5px 0.5px 0 rgba(255, 255, 255, 0.55), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.5), inset 0 0 28px -6px rgba(${theme.glowPrimary}, 0.2), inset 1px 0 0 rgba(255, 255, 255, 0.1)`,
                    }}
                  >
                    {/* Top Specular Sheen Refraction Stripe */}
                    <div
                      className="absolute top-0 inset-x-0 h-[1.5px] pointer-events-none"
                      style={{
                        background: `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.15) 15%, rgba(255, 255, 255, 0.85) 50%, rgba(${theme.glowPrimary}, 0.75) 75%, transparent 100%)`,
                      }}
                    />
                    <div>
                      <span className="font-bold tracking-wide text-sm text-white block">
                        Animation Flow Speed
                      </span>
                      <span className="text-[11px] font-medium text-zinc-400 mt-0.5 block leading-relaxed">
                        Control how fast the background ripples and drifts.
                      </span>
                    </div>
                    <div className="flex gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5 relative">
                      {(['slow', 'normal', 'fast'] as ShaderSpeed[]).map((spd) => {
                        const isSpdActive = shaderConfig.speed === spd;
                        return (
                          <button
                            key={spd}
                            onClick={() => shaderConfig.setSpeed(spd)}
                            className={`relative flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer select-none ${
                              isSpdActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {isSpdActive && (
                              <motion.div
                                layoutId="shaderSpeedGlider"
                                transition={springGlider}
                                className="absolute inset-0 rounded-lg border"
                                style={{
                                  borderColor: `rgba(${theme.glowPrimary}, 0.5)`,
                                  backgroundColor: `rgba(${theme.glowPrimary}, 0.18)`,
                                  boxShadow: `0 0 12px rgba(${theme.glowPrimary}, 0.25)`,
                                }}
                              />
                            )}
                            <span className="relative z-10" style={isSpdActive ? { color: `rgb(${theme.glowPrimary})` } : undefined}>
                              {spd}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interactive Toggle */}
                  <ToggleSwitch
                    theme={theme}
                    label="Mouse Fluid Ripple"
                    description="Distort and refract liquid light as you move your cursor."
                    icon={Sparkles}
                    checked={shaderConfig.interactive}
                    onChange={shaderConfig.setInteractive}
                  />
                </div>

                {/* Performance & GPU Optimization Row */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-zinc-400 tracking-wider uppercase mb-3 flex items-center gap-2">
                    <Gauge size={14} style={{ color: `rgb(${theme.glowPrimary})` }} /> Performance & GPU Optimization
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <ToggleSwitch
                      theme={theme}
                      label="Active Typing GPU Freeze"
                      description="Freezes heavy background WebGL shaders during active typing tests to maximize frame rate and eliminate input latency."
                      icon={Zap}
                      checked={shaderConfig.activeTypingThrottle}
                      onChange={shaderConfig.setActiveTypingThrottle}
                    />

                    {/* Telemetry Status Card */}
                    <div className="flex items-center justify-between p-5 rounded-2xl border border-white/5 bg-white/[0.03]">
                      <div className="flex items-center gap-3.5">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0"
                          style={{
                            backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                            borderColor: `rgba(${theme.glowPrimary}, 0.3)`,
                            color: `rgb(${theme.glowPrimary})`,
                          }}
                        >
                          <Activity size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold tracking-wide text-sm text-white">Input Latency Mode</span>
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border"
                              style={{
                                backgroundColor: shaderConfig.activeTypingThrottle
                                  ? `rgba(${theme.glowPrimary}, 0.2)`
                                  : 'rgba(255,255,255,0.06)',
                                borderColor: shaderConfig.activeTypingThrottle
                                  ? `rgba(${theme.glowPrimary}, 0.4)`
                                  : 'rgba(255,255,255,0.1)',
                                color: shaderConfig.activeTypingThrottle
                                  ? `rgb(${theme.glowPrimary})`
                                  : 'rgb(161,161,170)',
                              }}
                            >
                              {shaderConfig.activeTypingThrottle ? 'Zero-Jitter Active' : 'Full Render'}
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-zinc-400 mt-0.5 leading-relaxed">
                            {shaderConfig.activeTypingThrottle
                              ? '0 WebGL draws while typing. 100% frame budget reserved for keystrokes.'
                              : 'Continuous 144Hz/240Hz WebGL noise calculations rendered during test.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 grid-flow-dense animate-in fade-in duration-300">
                {/* 1. Sticky Keys Toggle */}
                <ToggleSwitch
                  theme={theme}
                  label="Sticky Keys"
                  description="Force correction of keystroke errors before progressing."
                  icon={Magnet}
                  checked={stickyKeysMode}
                  onChange={setStickyKeysMode}
                />

                {/* 2. WebHID Mechanical Keyboard Latency & Jitter Benchmark */}
                <div
                  id="hardware-hid-benchmark-btn"
                  data-testid="hardware-hid-benchmark-btn"
                  onClick={() => onOpenWebHidBenchmark?.()}
                  className="p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all cursor-pointer flex items-center justify-between group"
                  style={{
                    boxShadow: `0 0 15px rgba(${theme.glowPrimary}, 0.05)`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2.5 rounded-xl border"
                      style={{
                        backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                        borderColor: `rgba(${theme.glowPrimary}, 0.3)`,
                        color: `rgb(${theme.glowPrimary})`,
                      }}
                    >
                      <Cpu size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        Hardware HID Benchmark
                        <span
                          className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded border uppercase"
                          style={{
                            backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                            borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                            color: `rgb(${theme.glowPrimary})`,
                          }}
                        >
                          8000Hz Live
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        Benchmark true USB polling rate, jitter, and matrix switch chatter.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Storage & Data Vault */}
                <div
                  className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl flex flex-col justify-between gap-4"
                  style={{
                    borderColor: `rgba(${theme.glowPrimary}, 0.15)`,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2.5 rounded-xl border shrink-0"
                        style={{
                          backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                          borderColor: `rgba(${theme.glowPrimary}, 0.3)`,
                          color: `rgb(${theme.glowPrimary})`,
                        }}
                      >
                        <Database size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                          Storage & Data Vault
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          Manage persistent client state, local match histories, and backup schemas.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="flex-1 py-2 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Download size={13} style={{ color: `rgb(${theme.glowPrimary})` }} />
                      Export Backup JSON
                    </button>
                    <button
                      type="button"
                      onClick={handleClearCache}
                      className="py-2 px-3 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-[11px] font-mono font-bold transition-all cursor-pointer active:scale-95"
                    >
                      Clear Cache
                    </button>
                  </div>
                </div>

                {/* 4. Engine Shortcuts & Safeguards */}
                <div
                  className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl flex flex-col justify-between gap-3"
                  style={{
                    borderColor: `rgba(${theme.glowPrimary}, 0.15)`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2.5 rounded-xl border shrink-0"
                      style={{
                        backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                        borderColor: `rgba(${theme.glowPrimary}, 0.3)`,
                        color: `rgb(${theme.glowPrimary})`,
                      }}
                    >
                      <Terminal size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                        Engine Shortcuts
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        High-frequency keybindings configured for instant competition flow.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[10px] font-mono">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5">
                      <span className="text-zinc-400">Restart Test</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold border border-white/10">Tab+Enter</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5">
                      <span className="text-zinc-400">Erase Word</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold border border-white/10">Ctrl+BS</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5">
                      <span className="text-zinc-400">God Mode Terminal</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold border border-white/10">Ctrl+Shift+G</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5">
                      <span className="text-zinc-400">Pause Engine</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold border border-white/10">Esc</kbd>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="flex flex-col max-w-4xl mx-auto pb-6 space-y-8 animate-in fade-in duration-300">
                
                {/* ── 1. ARU NEURAL CORE STATUS & LIVE HEALTH ── */}
                <div
                  className="glass-panel rounded-3xl p-6 md:p-8 border relative overflow-hidden transition-all duration-300"
                  style={{
                    borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                    boxShadow: `0 0 30px rgba(${theme.glowPrimary}, 0.08)`,
                  }}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0"
                        style={{
                          backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                          borderColor: `rgba(${theme.glowPrimary}, 0.4)`,
                          boxShadow: `0 0 20px rgba(${theme.glowPrimary}, 0.25)`,
                        }}
                      >
                        <Bot size={24} style={{ color: `rgb(${theme.glowPrimary})` }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-white tracking-wide uppercase">
                            Aru Neural Engine
                          </h4>
                          <span
                            className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black tracking-widest uppercase border"
                            style={{
                              backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                              borderColor: `rgba(${theme.glowPrimary}, 0.3)`,
                              color: `rgb(${theme.glowPrimary})`,
                            }}
                          >
                            V3.1 CORE
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Universal BYOK, Chrome Gemini Nano local inference, and adaptive typing coaching.
                        </p>
                      </div>
                    </div>

                    {/* Instant Live Ping Test */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={async () => {
                          setPingStatus('running');
                          setPingReply(null);
                          const res = await triggerAruPing();
                          if (res.success) {
                            setPingStatus('success');
                            setPingReply(res.reply);
                            setPingLatency(res.latency);
                            toast.success(`Aru responded in ${res.latency}ms!`);
                          } else {
                            setPingStatus('error');
                            setPingReply(res.reply);
                            setPingLatency(res.latency);
                            toast.error(`Aru ping failed: ${res.reply}`);
                          }
                        }}
                        disabled={pingStatus === 'running'}
                        className="px-4 py-2 rounded-xl text-xs font-bold tracking-wide uppercase flex items-center justify-center gap-2 cursor-pointer transition-all border w-full md:w-auto"
                        style={{
                          backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                          borderColor: `rgba(${theme.glowPrimary}, 0.4)`,
                          color: `rgb(${theme.glowPrimary})`,
                        }}
                      >
                        {pingStatus === 'running' ? (
                          <>
                            <Loader2 size={13} className="animate-spin" /> Pinging Core...
                          </>
                        ) : (
                          <>
                            <Zap size={13} /> Test Aru Ping
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Engine Tier Matrix Badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div
                      className={`p-3.5 rounded-2xl border transition-all ${
                        engineTier.hasKey
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-white/[0.02] border-white/5 text-zinc-500'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-wider uppercase mb-1">
                        <span>Tier 1: Cloud BYOK</span>
                        {engineTier.hasKey && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                      </div>
                      <div className="text-xs font-bold text-white truncate">
                        {engineTier.hasKey ? PROVIDER_PRESETS.find(p => p.id === selectedProvider)?.label || 'Custom Endpoint' : 'Unconfigured'}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
                        {engineTier.hasKey ? byokModel : 'Add key below for LLM models'}
                      </div>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl border transition-all ${
                        engineTier.hasNative
                          ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                          : 'bg-white/[0.02] border-white/5 text-zinc-500'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-wider uppercase mb-1">
                        <span>Tier 2: Chrome Nano</span>
                        {engineTier.hasNative && <span className="w-2 h-2 rounded-full bg-sky-400" />}
                      </div>
                      <div className="text-xs font-bold text-white">
                        {engineTier.hasNative ? 'Gemini Nano Ready' : 'Browser Unsupported'}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {engineTier.hasNative ? 'Zero-latency local AI' : 'Requires Chrome Dev/Canary'}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl border bg-white/[0.04] border-white/10 text-zinc-300">
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-wider uppercase mb-1">
                        <span>Tier 3: Heuristics</span>
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      </div>
                      <div className="text-xs font-bold text-white">Procedural Fallback</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">Always active offline fallback</div>
                    </div>
                  </div>

                  {/* Ping Output Banner */}
                  {pingReply && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-4 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                        pingStatus === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                      }`}
                    >
                      <Bot size={15} className="shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between font-mono text-[10px] opacity-75 mb-0.5">
                          <span>ARU RESPONSE ({pingLatency}ms)</span>
                          <span>{pingStatus === 'success' ? 'CALIBRATED' : 'FAULT'}</span>
                        </div>
                        <p className="font-medium italic">"{pingReply}"</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* ── 2. COACHING PERSONA CUSTOMIZER ── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-zinc-300 tracking-wider uppercase flex items-center gap-2">
                      <Sparkles size={14} style={{ color: `rgb(${theme.glowPrimary})` }} /> Coaching Persona & Tone
                    </h4>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">
                      ACTIVE: {ARU_PERSONAS[persona].name}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {(Object.keys(ARU_PERSONAS) as AruPersona[]).map((pKey) => {
                      const p = ARU_PERSONAS[pKey];
                      const isSelected = persona === pKey;
                      const PIcon = PERSONA_ICONS[pKey] || Crosshair;
                      return (
                        <motion.button
                          key={p.id}
                          whileHover={{ scale: 1.025, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          transition={springSnappy}
                          onClick={() => {
                            setPersona(pKey);
                            toast.success(`Coaching mode set to ${p.name}`);
                          }}
                          style={
                            isSelected
                              ? {
                                  borderColor: `rgba(${theme.glowPrimary}, 0.6)`,
                                  backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                                  boxShadow: `0 0 20px rgba(${theme.glowPrimary}, 0.25)`,
                                }
                              : undefined
                          }
                          className={`group relative p-4 rounded-2xl border text-left transition-colors cursor-pointer flex flex-col justify-between overflow-hidden select-none ${
                            isSelected
                              ? 'border'
                              : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.07] hover:border-white/15'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-7 h-7 rounded-lg flex items-center justify-center border"
                                  style={{
                                    backgroundColor: isSelected ? `rgba(${theme.glowPrimary}, 0.2)` : 'rgba(255, 255, 255, 0.05)',
                                    borderColor: isSelected ? `rgba(${theme.glowPrimary}, 0.5)` : 'rgba(255, 255, 255, 0.1)',
                                    color: isSelected ? `rgb(${theme.glowPrimary})` : '#a1a1aa',
                                  }}
                                >
                                  <PIcon size={14} />
                                </div>
                                <div>
                                  <span className="text-xs font-black tracking-wide text-white uppercase block">
                                    {p.name}
                                  </span>
                                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                                    {p.badge}
                                  </span>
                                </div>
                              </div>
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={springSnappy}
                                >
                                  <Check size={14} style={{ color: `rgb(${theme.glowPrimary})` }} />
                                </motion.div>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed mt-2">
                              {p.tagline}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* ── 3. POST-MATCH DEBRIEF POLICY ── */}
                <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.03] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="font-bold tracking-wide text-xs text-white block">
                      Post-Match Neuro-Debrief Policy
                    </span>
                    <span className="text-[11px] font-medium text-zinc-400 mt-0.5 block leading-relaxed">
                      Choose when Aru evaluates your performance on the post-match Results screen.
                    </span>
                  </div>

                  <div className="flex gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5 relative w-full sm:w-auto">
                    {[
                      { id: 'always', label: 'Always' },
                      { id: 'smart', label: 'Milestones' },
                      { id: 'manual', label: 'On-Demand' },
                    ].map((item) => {
                      const isItemActive = debriefPolicy === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setDebriefPolicy(item.id as DebriefPolicy)}
                          className={`relative flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer select-none ${
                            isItemActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {isItemActive && (
                            <motion.div
                              layoutId="debriefPolicyGlider"
                              transition={springGlider}
                              className="absolute inset-0 rounded-lg border"
                              style={{
                                borderColor: `rgba(${theme.glowPrimary}, 0.5)`,
                                backgroundColor: `rgba(${theme.glowPrimary}, 0.18)`,
                                boxShadow: `0 0 12px rgba(${theme.glowPrimary}, 0.25)`,
                              }}
                            />
                          )}
                          <span className="relative z-10" style={isItemActive ? { color: `rgb(${theme.glowPrimary})` } : undefined}>
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── 4. AUTO-FETCH PROVIDER & LIVE MODELS ENGINE ── */}
                <div className="flex flex-col gap-5 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-300 tracking-wider uppercase flex items-center gap-2">
                      <Settings size={14} style={{ color: `rgb(${theme.glowPrimary})` }} /> Universal BYOK Configuration
                    </h4>
                    {isAutoFetching && (
                      <span className="flex items-center gap-1.5 text-[10px] font-mono animate-pulse" style={{ color: `rgb(${theme.glowPrimary})` }}>
                        <Loader2 size={11} className="animate-spin" /> AUTO-FETCHING LIVE MODELS...
                      </span>
                    )}
                  </div>

                  {/* Zero-Knowledge Privacy & Security Card */}
                  <div
                    className="p-4 rounded-2xl border backdrop-blur-md flex flex-col gap-2.5 transition-all"
                    style={{
                      borderColor: `rgba(${theme.glowPrimary}, 0.25)`,
                      backgroundColor: `rgba(${theme.glowPrimary}, 0.04)`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center border shrink-0"
                          style={{
                            backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                            borderColor: `rgba(${theme.glowPrimary}, 0.3)`,
                          }}
                        >
                          <ShieldCheck size={18} style={{ color: `rgb(${theme.glowPrimary})` }} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white tracking-wide flex items-center gap-2 flex-wrap">
                            Zero-Knowledge Local Storage
                            <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 border border-white/10">
                              Client Direct
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 leading-snug">
                            Keys never touch TypeNova servers. All AI coaching communicates directly via browser HTTPS.
                          </div>
                        </div>
                      </div>
                      {byokKey ? (
                        <button
                          type="button"
                          onClick={() => {
                            clearKeyAndHistory();
                            setUsageTokens(0);
                            setUsageRequests(0);
                            setDailyTokens(0);
                            setDailyRequests(0);
                            setRollingUsage({ tokens: 0, requests: 0 });
                            toast.success('AI credentials and local session cache erased.');
                          }}
                          className="px-2.5 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                          title="Purge key and all local AI history"
                        >
                          <Trash2 size={12} /> Erase Key
                        </button>
                      ) : null}
                    </div>

                    {/* Storage Persistence Selector */}
                    <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Storage Persistence:
                      </span>
                      <div className="grid grid-cols-2 p-0.5 bg-black/40 border border-white/10 rounded-xl max-w-xs text-[10px] font-semibold">
                        <button
                          type="button"
                          onClick={() => setKeyPersistence('persistent')}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer text-center ${
                            keyPersistence === 'persistent'
                              ? 'text-white shadow-sm'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                          style={
                            keyPersistence === 'persistent'
                              ? {
                                  backgroundColor: `rgba(${theme.glowPrimary}, 0.25)`,
                                  color: `rgb(${theme.glowPrimary})`,
                                }
                              : undefined
                          }
                        >
                          Remember Key
                        </button>
                        <button
                          type="button"
                          onClick={() => setKeyPersistence('session')}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer text-center ${
                            keyPersistence === 'session'
                              ? 'text-white shadow-sm'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                          style={
                            keyPersistence === 'session'
                              ? {
                                  backgroundColor: `rgba(${theme.glowPrimary}, 0.25)`,
                                  color: `rgb(${theme.glowPrimary})`,
                                }
                              : undefined
                          }
                        >
                          Session Only
                        </button>
                      </div>
                    </div>
                    <div className="text-[9px] text-zinc-500 italic">
                      {keyPersistence === 'persistent'
                        ? 'Key persists across browser restarts on this machine via localStorage.'
                        : 'Key is kept in sessionStorage and discarded when you close this tab (recommended for shared or public devices).'}
                    </div>
                  </div>

                  {/* API Key Input */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center justify-between">
                      <span>Provider API Key <span className="text-zinc-500 normal-case tracking-normal font-medium ml-1">({PROVIDER_PRESETS.find(p => p.id === selectedProvider)?.label || 'Custom'} Key)</span></span>
                      <span className="inline-flex items-center gap-1 text-[8px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10">
                        <Zap size={9} style={{ color: `rgb(${theme.glowPrimary})` }} className="shrink-0" /> AUTO-DETECT ENABLED
                      </span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={byokKey}
                        onChange={(e) => handleKeyChange(e.target.value)}
                        placeholder="sk-... or gsk_... (Paste any key to auto-configure)"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pr-36 text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-all font-medium"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-all cursor-pointer"
                          title={showApiKey ? 'Hide API key' : 'Show API key'}
                        >
                          {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => {
                            if (byokKey.trim()) {
                              testConnection(byokKey, byokUrl);
                              toast.success('API Key validated & saved!');
                            } else {
                              toast('Key cleared.');
                            }
                          }}
                          className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                          style={{
                            backgroundColor: `rgba(${theme.glowPrimary}, 0.2)`,
                            color: `rgb(${theme.glowPrimary})`,
                          }}
                        >
                          SAVE & TEST
                        </button>
                      </div>
                    </div>
                    {isAmbiguousSk && (
                      <div className="mt-1 text-[10px] text-amber-400/90 flex items-center gap-1.5">
                        <AlertTriangle size={12} />
                        If this is an Anthropic key, use an OpenAI-compatible proxy like OpenRouter. Direct Anthropic URLs require custom translation.
                      </div>
                    )}
                  </div>

                  {/* Target Model Selector with Live Fetch */}
                  <div className={`flex flex-col gap-2 ${selectedProvider !== 'custom' && availableModels.length === 0 ? 'opacity-70' : ''}`}>
                    <label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center justify-between">
                      <span className="flex items-center gap-2">Target Model ID</span>
                      {availableModels.length > 0 && (
                        <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[8px] font-mono font-bold tracking-wider uppercase border border-emerald-500/20 flex items-center gap-1">
                          <Check size={9} /> {availableModels.length} LIVE MODELS AUTO-FETCHED
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={byokModel}
                        onChange={(e) => {
                          handleModelChange(e.target.value);
                          setIsModelDropdownOpen(true);
                        }}
                        onFocus={() => { if (availableModels.length > 0) setIsModelDropdownOpen(true); }}
                        placeholder="groq/compound-mini"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pr-10 text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-all font-medium"
                      />
                      {availableModels.length > 0 && (
                        <button
                          onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
                        </button>
                      )}

                      {isModelDropdownOpen && availableModels.length > 0 && (
                        <div className="absolute top-full mt-2 w-full max-h-56 overflow-y-auto bg-zinc-950/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl z-[100] overflow-hidden custom-scrollbar">
                          {(() => {
                            const isExactMatch = availableModels.some(m => m.toLowerCase() === byokModel.toLowerCase());
                            const displayedModels = isExactMatch
                              ? availableModels
                              : availableModels.filter(m => m.toLowerCase().includes(byokModel.toLowerCase()));

                            return (
                              <>
                                {displayedModels.map(m => (
                                  <div
                                    key={m}
                                    onClick={() => {
                                      handleModelChange(m);
                                      setIsModelDropdownOpen(false);
                                    }}
                                    className="px-4 py-3 flex items-center justify-between cursor-pointer transition-colors text-xs font-mono text-zinc-300 hover:bg-white/10 hover:text-white border-b border-white/5 last:border-0"
                                  >
                                    <span>{m}</span>
                                    {engineConfig.workingModels?.includes(m) && (
                                      <span className="text-[9px] text-emerald-400 font-sans tracking-widest uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                        ⭐ Recommended
                                      </span>
                                    )}
                                  </div>
                                ))}
                                {displayedModels.length === 0 && (
                                  <div className="px-4 py-3 text-xs font-mono text-zinc-500">No models match "{byokModel}"</div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Base URL Row */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center justify-between">
                      <span>Base URL</span>
                      <span className="text-[8px] text-zinc-500 bg-black/40 px-2 py-0.5 rounded border border-white/5 font-mono normal-case tracking-normal">
                        OpenAI-compatible /v1 endpoint
                      </span>
                    </label>
                    <div className="relative group">
                      <input
                        type="url"
                        value={byokUrl}
                        onChange={(e) => {
                          setByokUrl(e.target.value);
                          localStorage.setItem(AI_KEYS.byokUrl, e.target.value);
                          const preset = PROVIDER_PRESETS.find(p => p.url === e.target.value && p.id !== 'custom');
                          setSelectedProvider(preset ? preset.id : 'custom');
                        }}
                        placeholder="https://api.groq.com/openai/v1"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pr-36 text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-all font-medium"
                      />

                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        <button
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="px-3.5 py-2 bg-white/10 hover:bg-white/15 text-xs font-bold text-zinc-200 rounded-xl border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          {PROVIDER_PRESETS.find(p => p.id === selectedProvider)?.label || 'Custom'}
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
                        </button>

                        {isDropdownOpen && (
                          <div className="absolute right-0 top-full mt-2 w-52 bg-zinc-950/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl z-50 overflow-hidden">
                            {PROVIDER_PRESETS.map((preset) => (
                              <button
                                key={preset.id}
                                onClick={() => {
                                  handleProviderSelect(preset.id);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors border-b border-white/5 last:border-0 hover:bg-white/10 ${selectedProvider === preset.id ? 'text-white bg-white/15' : 'text-zinc-400'}`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Provider Console Helper Link */}
                  <div className="mt-1 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
                    <Info size={16} className="text-zinc-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Need a free key? Get an instant, high-speed free tier key at the{' '}
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold underline underline-offset-2 transition-colors text-white hover:text-zinc-200"
                      >
                        Groq Developer Console
                      </a>{' '}
                      or{' '}
                      <a
                        href="https://openrouter.ai/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold underline underline-offset-2 transition-colors text-white hover:text-zinc-200"
                      >
                        OpenRouter Console
                      </a>.
                    </p>
                  </div>

                  {/* Connection Status Badges */}
                  {connectionStatus === 'testing' && (
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3 animate-in fade-in">
                      <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-transparent animate-spin" />
                      <p className="text-xs text-zinc-300 font-bold">Validating Connection & Fetching Live Models...</p>
                    </div>
                  )}
                  {connectionStatus === 'success' && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 animate-in fade-in">
                      <Check size={16} className="text-emerald-400 shrink-0" />
                      <p className="text-xs text-emerald-300 font-bold">
                        Connected Successfully • Found {availableModels.length} models {latencyMs !== null ? `(${latencyMs}ms latency)` : ''}
                      </p>
                    </div>
                  )}
                  {connectionStatus === 'error' && (
                    <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 animate-in fade-in">
                      <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300 leading-relaxed font-mono">
                        {connectionError}
                      </p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {activeTab === 'usage' && (
              <div className="flex flex-col w-full gap-6 animate-in fade-in duration-300">
                {/* 1. TOP TELEMETRY STATUS & LIVE DIAGNOSTIC BAR */}
                <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-2xl relative overflow-hidden">
                  <div
                    className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
                    style={{ backgroundColor: `rgb(${theme.glowPrimary})` }}
                  />

                  <div className="flex items-center gap-4 relative z-10">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xl shrink-0"
                      style={{
                        backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                        borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                        color: `rgb(${theme.glowPrimary})`,
                        boxShadow: `0 0 25px rgba(${theme.glowPrimary}, 0.2)`,
                      }}
                    >
                      <Activity size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-black tracking-wide text-white uppercase font-mono">
                          Telemetry & Neural Rate Engine
                        </span>
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Live Monitor
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                        Hardware session throughput, instantaneous token rate ceilings, and 24-hour quota telemetry.
                      </p>
                    </div>
                  </div>

                  {/* Actions & Diagnostic Trigger */}
                  <div className="flex flex-wrap items-center gap-2.5 relative z-10 shrink-0">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={async () => {
                        setPingStatus('running');
                        setPingReply(null);
                        const res = await triggerAruPing();
                        if (res.success) {
                          setPingStatus('success');
                          setPingReply(res.reply);
                          setPingLatency(res.latency);
                          toast.success(`Aru responded in ${res.latency}ms!`);
                        } else {
                          setPingStatus('error');
                          setPingReply(res.reply);
                          setPingLatency(res.latency);
                          toast.error(`Aru ping failed: ${res.reply}`);
                        }
                      }}
                      disabled={pingStatus === 'running'}
                      className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 border cursor-pointer shadow-lg transition-all"
                      style={{
                        backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                        borderColor: `rgba(${theme.glowPrimary}, 0.4)`,
                        color: `rgb(${theme.glowPrimary})`,
                      }}
                    >
                      {pingStatus === 'running' ? (
                        <>
                          <Loader2 size={13} className="animate-spin" /> Probing Neural Link...
                        </>
                      ) : (
                        <>
                          <Zap size={13} className="fill-current" />
                          {pingLatency ? `Probe Ping (${pingLatency}ms)` : 'Run Latency Probe'}
                        </>
                      )}
                    </motion.button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('ai')}
                      className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <span>Smart Engine</span>
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                </div>

                {/* 2. 6-COLUMN KPI BENTO GRID */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5 w-full">
                  {/* Metric 1: Tokens */}
                  <div className="bg-black/40 border border-white/10 backdrop-blur-xl rounded-2xl p-4 flex flex-col justify-between group hover:border-white/20 transition-all shadow-lg relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-400 uppercase">Tokens</span>
                      <div className="p-1.5 rounded-lg bg-white/5">
                        <Cpu size={14} style={{ color: `rgb(${theme.glowPrimary})` }} />
                      </div>
                    </div>
                    <div className="text-2xl font-mono font-black text-white tracking-tight">
                      {usageTokens.toLocaleString()}
                    </div>
                    <span className="text-[9px] text-zinc-500 font-mono mt-1">Lifetime session</span>
                  </div>

                  {/* Metric 2: API Calls */}
                  <div className="bg-black/40 border border-white/10 backdrop-blur-xl rounded-2xl p-4 flex flex-col justify-between group hover:border-white/20 transition-all shadow-lg relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-400 uppercase">API Calls</span>
                      <div className="p-1.5 rounded-lg bg-white/5">
                        <Terminal size={14} style={{ color: `rgb(${theme.glowPrimary})` }} />
                      </div>
                    </div>
                    <div className="text-2xl font-mono font-black text-white tracking-tight">
                      {usageRequests.toLocaleString()}
                    </div>
                    <span className="text-[9px] text-zinc-500 font-mono mt-1">Total model prompts</span>
                  </div>

                  {/* Metric 3: Avg Prompt Size */}
                  <div className="bg-black/40 border border-white/10 backdrop-blur-xl rounded-2xl p-4 flex flex-col justify-between group hover:border-white/20 transition-all shadow-lg relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-400 uppercase">Avg Prompt</span>
                      <div className="p-1.5 rounded-lg bg-white/5">
                        <Zap size={14} style={{ color: `rgb(${theme.glowPrimary})` }} />
                      </div>
                    </div>
                    <div className="text-2xl font-mono font-black text-white tracking-tight">
                      {usageRequests > 0 ? Math.round(usageTokens / usageRequests).toLocaleString() : '0'}
                    </div>
                    <span className="text-[9px] text-zinc-500 font-mono mt-1">Tokens / generation</span>
                  </div>

                  {/* Metric 4: Free Cloud Value */}
                  <div className="bg-black/40 border border-white/10 backdrop-blur-xl rounded-2xl p-4 flex flex-col justify-between group hover:border-white/20 transition-all shadow-lg relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-400 uppercase">Free Value</span>
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Sparkles size={14} />
                      </div>
                    </div>
                    <div className="text-2xl font-mono font-black text-emerald-400 tracking-tight">
                      ${((usageTokens / 1000000) * 0.50).toFixed(4)}
                    </div>
                    <span className="text-[9px] text-zinc-500 font-mono mt-1">@ $0.50/1M standard</span>
                  </div>

                  {/* Metric 5: Inference Latency */}
                  <div className="bg-black/40 border border-white/10 backdrop-blur-xl rounded-2xl p-4 flex flex-col justify-between group hover:border-white/20 transition-all shadow-lg relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold tracking-wider uppercase" style={{ color: `rgb(${theme.glowPrimary})` }}>Latency</span>
                      <div className="p-1.5 rounded-lg" style={{ backgroundColor: `rgba(${theme.glowPrimary}, 0.1)`, color: `rgb(${theme.glowPrimary})` }}>
                        <Timer size={14} />
                      </div>
                    </div>
                    <div className="text-2xl font-mono font-black tracking-tight" style={{ color: `rgb(${theme.glowPrimary})` }}>
                      {pingLatency ? `${pingLatency}ms` : latencyMs ? `${latencyMs}ms` : '< 200ms'}
                    </div>
                    <span className="text-[9px] text-zinc-500 font-mono mt-1">Roundtrip response</span>
                  </div>

                  {/* Metric 6: Quota Health */}
                  <div className="bg-black/40 border border-white/10 backdrop-blur-xl rounded-2xl p-4 flex flex-col justify-between group hover:border-white/20 transition-all shadow-lg relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-400">Health</span>
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <ShieldCheck size={14} />
                      </div>
                    </div>
                    <div className="text-2xl font-mono font-black text-emerald-300 tracking-tight">
                      100%
                    </div>
                    <span className="text-[9px] text-zinc-500 font-mono mt-1">Zero throttle errors</span>
                  </div>
                </div>

                {/* 3. MAIN DASHBOARD: 2-COLUMN SPLIT (QUOTA METERS + MODEL SPECS & ARCHITECTURE) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
                  {/* Left: Dual Rate Limit Consoles (7 Cols) */}
                  <div className="lg:col-span-7 flex flex-col gap-4">
                    {/* Console 1: 60-Second Burst Load */}
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex flex-col justify-between relative overflow-hidden shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: `rgb(${theme.glowPrimary})` }} />
                          <span className="text-xs font-mono font-bold tracking-wider text-white uppercase">
                            Instantaneous 60-Second Burst Window
                          </span>
                        </div>
                        <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                          Nominal Load
                        </span>
                      </div>

                      {/* TPM */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs font-mono mb-2">
                          <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                            <Gauge size={13} className="text-zinc-500" />
                            Tokens per Minute (TPM)
                          </span>
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="text-white text-sm">{rollingUsage.tokens.toLocaleString()}</span>
                            <span className="text-zinc-500">/ {activeLimits.tpm === Infinity ? '∞' : activeLimits.tpm.toLocaleString()}</span>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-mono ml-1.5"
                              style={{
                                backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                                color: `rgb(${theme.glowPrimary})`,
                              }}
                            >
                              {activeLimits.tpm === Infinity ? '0%' : `${Math.min(100, Math.round((rollingUsage.tokens / activeLimits.tpm) * 100))}%`}
                            </span>
                          </div>
                        </div>
                        {/* Progress Track */}
                        <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/10">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${activeLimits.tpm === Infinity ? 0 : Math.max(2, Math.min(100, (rollingUsage.tokens / activeLimits.tpm) * 100))}%`,
                              backgroundColor: `rgb(${theme.glowPrimary})`,
                              boxShadow: `0 0 12px rgba(${theme.glowPrimary}, 0.6)`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] font-mono text-zinc-600 mt-1">
                          <span>0 TPM</span>
                          <span>25%</span>
                          <span>50%</span>
                          <span>75%</span>
                          <span>{activeLimits.tpm === Infinity ? 'Unlimited' : `${(activeLimits.tpm / 1000).toFixed(0)}k`} Ceiling</span>
                        </div>
                      </div>

                      {/* RPM */}
                      <div>
                        <div className="flex items-center justify-between text-xs font-mono mb-2">
                          <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                            <Radio size={13} className="text-zinc-500" />
                            Requests per Minute (RPM)
                          </span>
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="text-white text-sm">{rollingUsage.requests.toLocaleString()}</span>
                            <span className="text-zinc-500">/ {activeLimits.rpm === Infinity ? '∞' : activeLimits.rpm.toLocaleString()}</span>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-mono ml-1.5"
                              style={{
                                backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                                color: `rgb(${theme.glowPrimary})`,
                              }}
                            >
                              {activeLimits.rpm === Infinity ? '0%' : `${Math.min(100, Math.round((rollingUsage.requests / activeLimits.rpm) * 100))}%`}
                            </span>
                          </div>
                        </div>
                        {/* Progress Track */}
                        <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/10">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${activeLimits.rpm === Infinity ? 0 : Math.max(2, Math.min(100, (rollingUsage.requests / activeLimits.rpm) * 100))}%`,
                              backgroundColor: `rgb(${theme.glowPrimary})`,
                              boxShadow: `0 0 12px rgba(${theme.glowPrimary}, 0.6)`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] font-mono text-zinc-600 mt-1">
                          <span>0 RPM</span>
                          <span>10 RPM</span>
                          <span>20 RPM</span>
                          <span>{activeLimits.rpm === Infinity ? 'Unlimited' : `${activeLimits.rpm} RPM`} Ceiling</span>
                        </div>
                      </div>
                    </div>

                    {/* Console 2: Daily Quota (24-Hour) */}
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex flex-col justify-between relative overflow-hidden shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                          <span className="text-xs font-mono font-bold tracking-wider text-white uppercase">
                            24-Hour Rolling Capacity Quota
                          </span>
                        </div>
                        <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10 font-bold uppercase">
                          Resets 00:00 UTC
                        </span>
                      </div>

                      {/* TPD */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs font-mono mb-2">
                          <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                            <Layers size={13} className="text-zinc-500" />
                            Tokens per Day (TPD)
                          </span>
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="text-white text-sm">{dailyTokens.toLocaleString()}</span>
                            <span className="text-zinc-500">/ {activeLimits.tpd === Infinity ? 'No limit' : activeLimits.tpd.toLocaleString()}</span>
                            {activeLimits.tpd === Infinity ? (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold ml-1.5">
                                ∞ UNLIMITED
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono ml-1.5" style={{ backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`, color: `rgb(${theme.glowPrimary})` }}>
                                {Math.min(100, Math.round((dailyTokens / activeLimits.tpd) * 100))}%
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Progress Track */}
                        <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/10">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${activeLimits.tpd === Infinity ? 0 : Math.max(2, Math.min(100, (dailyTokens / activeLimits.tpd) * 100))}%`,
                              backgroundColor: `rgb(${theme.glowPrimary})`,
                              boxShadow: `0 0 12px rgba(${theme.glowPrimary}, 0.5)`,
                            }}
                          />
                        </div>
                      </div>

                      {/* RPD */}
                      <div>
                        <div className="flex items-center justify-between text-xs font-mono mb-2">
                          <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                            <Radio size={13} className="text-zinc-500" />
                            Requests per Day (RPD)
                          </span>
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="text-white text-sm">{dailyRequests.toLocaleString()}</span>
                            <span className="text-zinc-500">/ {activeLimits.rpd === Infinity ? '∞' : activeLimits.rpd.toLocaleString()}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono ml-1.5" style={{ backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`, color: `rgb(${theme.glowPrimary})` }}>
                              {activeLimits.rpd === Infinity ? '0%' : `${Math.min(100, Math.round((dailyRequests / activeLimits.rpd) * 100))}%`}
                            </span>
                          </div>
                        </div>
                        {/* Progress Track */}
                        <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/10">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${activeLimits.rpd === Infinity ? 0 : Math.max(2, Math.min(100, (dailyRequests / activeLimits.rpd) * 100))}%`,
                              backgroundColor: `rgb(${theme.glowPrimary})`,
                              boxShadow: `0 0 12px rgba(${theme.glowPrimary}, 0.5)`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Active Model Architecture & Hardware Specs (5 Cols) */}
                  <div className="lg:col-span-5 flex flex-col gap-4">
                    {/* Model Architecture Card */}
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex flex-col justify-between shadow-xl relative overflow-hidden h-full">
                      <div>
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
                          <div className="flex items-center gap-2">
                            <Cpu size={16} style={{ color: `rgb(${theme.glowPrimary})` }} />
                            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                              Model Architecture & Specs
                            </span>
                          </div>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-300 uppercase">
                            Specs
                          </span>
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 gap-2.5 mb-4">
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Active Model</span>
                            <span className="text-xs font-mono font-bold text-white truncate mt-0.5">
                              {byokModel || 'groq/compound-mini'}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Context Window</span>
                            <span className="text-xs font-mono font-bold text-white mt-0.5">
                              131,072 Tokens
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Max Output</span>
                            <span className="text-xs font-mono font-bold text-white mt-0.5">
                              8,192 Tokens
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Free Token Rate</span>
                            <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                              0$ Free Tier
                            </span>
                          </div>
                        </div>

                        {/* Feature Badges */}
                        <div className="flex flex-col gap-2 mb-4">
                          <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                            Engine Capabilities
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                              <Zap size={11} style={{ color: `rgb(${theme.glowPrimary})` }} className="shrink-0" /> Real-time Typing Coaching
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                              <Crosshair size={11} style={{ color: `rgb(${theme.glowPrimary})` }} className="shrink-0" /> Weak-Key Clustering
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                              <BarChart size={11} style={{ color: `rgb(${theme.glowPrimary})` }} className="shrink-0" /> Post-Match Neuro-Debriefs
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                              <ShieldCheck size={11} className="text-emerald-400 shrink-0" /> Zero-Cost Cloud BYOK
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Live Probe Status Banner */}
                      <div className="mt-2 p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: pingStatus === 'success' ? '#10b981' : pingStatus === 'error' ? '#ef4444' : `rgb(${theme.glowPrimary})`,
                            }}
                          />
                          <span className="text-[11px] font-mono text-zinc-300">
                            {pingStatus === 'success' && pingLatency
                              ? `Probe Latency: ${pingLatency}ms`
                              : pingStatus === 'running'
                              ? 'Sending Neural Probe...'
                              : 'Ready for Latency Probe'}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-zinc-500">
                          {byokKey ? 'BYOK Connected' : 'Guest Key Ready'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. FOOTER CONTROLS & LOCAL TELEMETRY ASSURANCE */}
                <div className="w-full bg-black/30 border border-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                      <ShieldCheck size={16} />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-mono font-bold text-zinc-200">
                        100% Client-Side Hardware Telemetry
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        All token meters and requests are calculated locally in your browser storage. Zero tracking servers.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={resetUsageStats}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-red-400 hover:text-white hover:bg-red-500/20 transition-all border border-red-500/30 hover:border-red-500/50 cursor-pointer shadow-sm"
                    >
                      <RotateCcw size={12} /> Reset Stats
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'faq' && (
              <SettingsFAQPanel
                theme={theme}
                onNavigateTab={setActiveTab}
                onPlayPreviewSound={onPlayPreviewSound}
                soundProfile={soundProfile}
              />
            )}

            {activeTab === 'report' && (
              <div className="flex flex-col h-full max-w-2xl mx-auto">
                <div className="mb-6">
                  <h4 className="text-sm font-black text-white tracking-widest uppercase mb-2 flex items-center gap-2">
                    <Bug size={16} className="text-red-400" /> Submit a Bug Report
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Found a glitch or have feedback? Describe it below. If applicable, attach a screenshot so we can reproduce it!
                  </p>
                </div>

                <textarea
                  value={reportMsg}
                  onChange={(e) => setReportMsg(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  className="w-full h-32 bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-sm font-mono text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 resize-none mb-4"
                />

                <div className="flex flex-col gap-2 mb-6">
                  <div className="flex items-center gap-4 flex-wrap">
                    <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800/50 border border-white/10 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer transition-all ${
                      isValidatingFile ? 'opacity-50 pointer-events-none' : ''
                    }`}>
                      {isValidatingFile ? (
                        <Loader2 size={16} className="animate-spin text-red-400" />
                      ) : (
                        <ImagePlus size={16} />
                      )}
                      {reportFile ? 'Screenshot Attached' : 'Attach Screenshot'}
                      <input
                        ref={reportFileInputRef}
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,.gif,.avif,image/png,image/jpeg,image/webp,image/gif,image/avif"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          setIsValidatingFile(true);
                          setReportErrorMsg(null);

                          try {
                            const validation = await validateBugReportFile(file);
                            if (!validation.valid) {
                              setReportFile(null);
                              setReportFileSize('');
                              setReportErrorMsg(validation.error || 'Invalid file uploaded.');
                              setReportStatus('error');
                              if (reportFileInputRef.current) reportFileInputRef.current.value = '';
                              return;
                            }

                            setReportFile(file);
                            setReportFileSize(formatFileSize(file.size));
                            setReportErrorMsg(null);
                            if (reportStatus === 'error') setReportStatus('idle');
                          } catch (err: any) {
                            setReportFile(null);
                            setReportFileSize('');
                            setReportErrorMsg(err?.message || 'Failed to inspect file.');
                            setReportStatus('error');
                            if (reportFileInputRef.current) reportFileInputRef.current.value = '';
                          } finally {
                            setIsValidatingFile(false);
                          }
                        }}
                      />
                    </label>

                    {reportFile && (
                      <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-white/10">
                        <span className="text-zinc-200 truncate max-w-[200px]" title={reportFile.name}>
                          {reportFile.name}
                        </span>
                        {reportFileSize && (
                          <span className="text-zinc-500 font-semibold shrink-0">({reportFileSize})</span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setReportFile(null);
                            setReportFileSize('');
                            setReportErrorMsg(null);
                            if (reportFileInputRef.current) reportFileInputRef.current.value = '';
                          }}
                          className="text-red-400 hover:text-red-300 ml-1 p-0.5 rounded hover:bg-red-500/10 transition-colors"
                          title="Remove attachment"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-500 font-mono">
                    PNG, JPG, WebP, GIF up to {MAX_REPORT_FILE_SIZE_LABEL}. Executables, scripts (.php, .jsp, etc.), and unsafe formats are blocked.
                  </p>
                </div>

                {reportStatus === 'error' && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-bold text-red-400 text-center flex items-center justify-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{reportErrorMsg || 'Failed to submit report. Please try again.'}</span>
                  </div>
                )}

                {reportStatus === 'success' && (
                  <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-400 text-center flex items-center justify-center gap-2">
                    <Check size={16} /> Report submitted successfully! Thank you.
                  </div>
                )}

                <button
                  disabled={!reportMsg.trim() || reportStatus === 'submitting' || reportStatus === 'success' || isValidatingFile}
                  onClick={async () => {
                    if (!reportMsg.trim()) return;
                    if (!supabase) {
                      toast.error('Cloud database service is currently unavailable. Please check your connection or report on GitHub.');
                      return;
                    }
                    setReportStatus('submitting');
                    setReportErrorMsg(null);
                    try {
                      let screenshot_url: string | null = null;
                      if (reportFile) {
                        // Re-validate right before uploading
                        const validation = await validateBugReportFile(reportFile);
                        if (!validation.valid) {
                          setReportErrorMsg(validation.error || 'Invalid file detected.');
                          setReportStatus('error');
                          return;
                        }

                        const safeExt = validation.sanitizedExt || 'png';
                        const randomId = typeof crypto !== 'undefined' && crypto.randomUUID 
                          ? crypto.randomUUID() 
                          : Math.random().toString(36).substring(2, 15);
                        // Upload under user's own folder for storage RLS compliance
                        const userId = (await supabase.auth.getUser()).data.user?.id || 'anon';
                        const fileName = `${userId}/bug_${randomId}_${Date.now()}.${safeExt}`;

                        const { data: uploadData, error: uploadError } = await supabase.storage
                          .from('bug-reports')
                          .upload(fileName, reportFile, {
                            contentType: reportFile.type || `image/${safeExt}`,
                            upsert: false,
                          });

                        if (uploadError) throw uploadError;

                        if (uploadData) {
                          const { data: { publicUrl } } = supabase.storage
                            .from('bug-reports')
                            .getPublicUrl(uploadData.path);
                          screenshot_url = publicUrl;
                        }
                      }

                      const { error: insertError } = await supabase
                        .from('bug_reports')
                        .insert({
                          message: reportMsg,
                          screenshot_url
                        });

                      if (insertError) throw insertError;
                      setReportStatus('success');
                      setReportMsg('');
                      setReportFile(null);
                      setReportFileSize('');
                      setReportErrorMsg(null);
                      if (reportFileInputRef.current) reportFileInputRef.current.value = '';
                      if (reportTimeoutRef.current) clearTimeout(reportTimeoutRef.current);
                      reportTimeoutRef.current = setTimeout(() => setReportStatus('idle'), 3000);
                    } catch (e: any) {
                      console.error("Bug report failed:", e);
                      setReportStatus('error');
                      setReportErrorMsg(e?.message || 'Failed to submit report. Please try again.');
                    }
                  }}
                  className="w-full py-4 rounded-xl font-black tracking-widest uppercase text-xs transition-all flex items-center justify-center gap-2 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reportStatus === 'submitting' ? <Loader2 size={16} className="animate-spin" /> : 'Submit Report'}
                </button>
              </div>
            )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Fullscreen Wallpaper Lightbox / Inspect View */}
      <AnimatePresence>
        {isWallpaperLightboxOpen && wallpaperUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-2xl flex flex-col p-4 sm:p-8 select-none"
            onClick={() => setIsWallpaperLightboxOpen(false)}
          >
            {/* Header */}
            <div className="flex items-center justify-between z-10 mb-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center border"
                  style={{
                    borderColor: `rgba(${theme.glowPrimary}, 0.4)`,
                    backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                    color: `rgb(${theme.glowPrimary})`,
                  }}
                >
                  <Eye size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Wallpaper Full View</h3>
                  <span className="text-[10px] font-mono text-zinc-400">100% UNCONSTRAINED UNRATED VIEW // ESC TO CLOSE</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsWallpaperLightboxOpen(false)}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Close (ESC)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Main Image Stage */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-2 sm:p-4" onClick={e => e.stopPropagation()}>
              <div
                className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 pointer-events-none"
                style={{ backgroundImage: `url(${wallpaperUrl})` }}
              />
              <img
                src={wallpaperUrl}
                alt="Wallpaper Full View"
                className="max-w-full max-h-full object-contain relative z-10 shadow-2xl rounded-xl"
                style={{
                  filter: `brightness(${brightness}) blur(${blur}px)`,
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
