import React, { useState, useEffect, useRef } from 'react';
import { X, Settings, Skull, Ghost, Brain, FlipHorizontal, CloudFog, Magnet, Timer, LayoutGrid, Palette, Volume2, Check, Bug, ImagePlus, Loader2, RotateCcw, Info, BarChart, AlertTriangle, Sparkles, Sun, Sliders, UploadCloud, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { THEMES, THEME_KEYS, SOUND_KEYS } from '@/data/constants';
import type { Theme } from '@/data/constants';
import { toast } from 'sonner';
import { AI_KEYS, GROQ_LIMITS, PROVIDER_PRESETS, limitsForModel } from '@/lib/aiClient';
import { useSmartEngineConfig } from '@/hooks/useSmartEngineConfig';
import { useShaderConfig, SHADER_MODES, type ShaderSpeed } from '@/hooks/useShaderConfig';
import { CURATED_WALLPAPERS, type CuratedWallpaper } from '@/hooks/useWallpaperTheme';
import { ACCENT_SWATCHES } from '@/lib/colorExtractor';

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
  <div
    onClick={() => onChange(!checked)}
    style={
      checked && !danger
        ? {
            borderColor: `rgba(${theme.glowPrimary}, 0.4)`,
            backgroundColor: `rgba(${theme.glowPrimary}, 0.08)`,
            boxShadow: `0 0 15px rgba(${theme.glowPrimary}, 0.15)`,
          }
        : undefined
    }
    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
      checked
        ? danger
          ? 'bg-red-500/10 border-red-500/30 shadow-[inset_0_0_20px_rgba(239,68,68,0.1)]'
          : ''
        : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.07] hover:border-white/15'
    }`}
  >
    <div className="flex items-center gap-3.5">
      <div
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
      </div>
      <div className="flex flex-col">
        <span className={`font-bold tracking-wide text-sm ${checked ? (danger ? 'text-red-400' : 'text-white') : 'text-zinc-400'}`}>
          {label}
        </span>
        <span className="text-[11px] font-medium text-zinc-500 mt-0.5 max-w-[250px] leading-relaxed">
          {description}
        </span>
      </div>
    </div>

    {/* Switch Track */}
    <div
      style={
        checked && !danger
          ? {
              backgroundColor: `rgb(${theme.glowPrimary})`,
              boxShadow: `0 0 10px rgba(${theme.glowPrimary}, 0.5)`,
            }
          : undefined
      }
      className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
        checked ? (danger ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : '') : 'bg-white/10'
      }`}
    >
      <div
        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
          checked ? 'translate-x-5 shadow-sm' : 'translate-x-0 opacity-70'
        }`}
      />
    </div>
  </div>
);

const TAB_HEADERS: Record<string, { title: string; desc: string }> = {
  visuals: { title: 'Appearance & Audio', desc: 'Customize your core color theme, typography font, and keystroke audio' },
  shaders: { title: 'Background Shader Engine', desc: 'Choose real-time WebGL visualizers, animation flow speeds, and mouse physics' },
  gameplay: { title: 'Gameplay Modifiers', desc: 'Configure challenge modifiers, ghost pacers, and difficulty restrictions' },
  system: { title: 'System Safeguards', desc: 'Typing engine behavior and input safeguards' },
  ai: { title: 'Smart Engine', desc: 'Universal Bring-Your-Own-Key configuration and AI provider settings' },
  usage: { title: 'Local AI Stats & Quotas', desc: 'Monitor your real-time token rate limits and request counts' },
  report: { title: 'Report an Issue', desc: 'Send diagnostics, bug reports, and UX feedback' },
};

interface TabItem {
  id: 'visuals' | 'shaders' | 'gameplay' | 'system' | 'ai' | 'usage' | 'report';
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
  { id: 'report', label: 'Report Issue', icon: Bug, danger: true },
];

export const SettingsModal = React.memo(function SettingsModal({
  theme,
  onClose,
  suddenDeath, setSuddenDeath,
  ghostPacer, setGhostPacer,
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
  handleFileUpload, clearWallpaper,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'gameplay' | 'visuals' | 'shaders' | 'system' | 'ai' | 'usage' | 'report'>('visuals');
  const [isDragging, setIsDragging] = useState(false);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  
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
    handleKeyChange, handleModelChange,
  } = engineConfig;
  
  const [_isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

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
    const interval = setInterval(updateRolling, 5000);
    return () => clearInterval(interval);
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

  // Bug Report State
  const [reportMsg, setReportMsg] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportStatus, setReportStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const reportTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (reportTimeoutRef.current) clearTimeout(reportTimeoutRef.current);
    };
  }, []);

  const currentHeader = TAB_HEADERS[activeTab] || { title: 'Settings', desc: '' };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 p-4 sm:p-6 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}>

      {/* Modal Container */}
      <div
        className="glass-panel !bg-zinc-950/90 w-full max-w-4xl h-[80vh] max-h-[720px] rounded-3xl border border-white/10 shadow-2xl flex flex-col md:flex-row overflow-hidden lucid-scale"
        onClick={e => e.stopPropagation()}
      >

        {/* Left Sidebar */}
        <div className="w-full md:w-60 border-b md:border-b-0 md:border-r border-white/5 bg-black/40 flex flex-col p-5 relative shrink-0">
          <div className="flex items-center justify-between md:justify-start gap-2.5 mb-4 md:mb-8">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center border"
              style={{
                borderColor: `rgba(${theme.glowPrimary}, 0.3)`,
                backgroundColor: `rgba(${theme.glowPrimary}, 0.1)`,
                color: `rgb(${theme.glowPrimary})`,
              }}
            >
              <Settings size={16} />
            </div>
            <h2 className="text-base font-bold tracking-wide text-white">Settings</h2>
          </div>

          <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={
                    isActive && !tab.danger
                      ? {
                          borderColor: `rgba(${theme.glowPrimary}, 0.4)`,
                          backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                          color: `rgb(${theme.glowPrimary})`,
                          boxShadow: `0 0 15px rgba(${theme.glowPrimary}, 0.15)`,
                        }
                      : undefined
                  }
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? tab.danger
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : 'border'
                      : tab.danger
                      ? 'text-red-400/60 hover:text-red-400 hover:bg-red-500/10 border border-transparent'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
                  }`}
                >
                  <Icon size={15} className="shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col relative bg-transparent min-w-0">

          <div className="absolute top-5 right-5 z-10">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer border border-white/5"
            >
              <X size={18} />
            </button>
          </div>

          {/* Header */}
          <div className="px-6 sm:px-8 py-5 border-b border-white/5 pr-16">
            <h3 className="text-lg font-bold tracking-wide text-white">
              {currentHeader.title}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {currentHeader.desc}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 custom-scrollbar space-y-7">

            {activeTab === 'gameplay' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <ToggleSwitch theme={theme}
                  label="Sudden Death"
                  description="One mistake immediately ends the test."
                  icon={Skull}
                  checked={suddenDeath}
                  onChange={setSuddenDeath}
                  danger={true}
                />
                <ToggleSwitch theme={theme}
                  label="Overclocked"
                  description="Fail if you dip below your average pacing."
                  icon={Timer}
                  checked={overclockedMode}
                  onChange={setOverclockedMode}
                  danger={true}
                />
                <ToggleSwitch theme={theme}
                  label="Blind Mode"
                  description="Hide the words as you type them."
                  icon={Brain}
                  checked={blindMode}
                  onChange={setBlindMode}
                />
                <ToggleSwitch theme={theme}
                  label="Fog Mode"
                  description="Only reveal words right before you type them."
                  icon={CloudFog}
                  checked={fogMode}
                  onChange={setFogMode}
                />
                <ToggleSwitch theme={theme}
                  label="Mirrored Mode"
                  description="Flip the text horizontally."
                  icon={FlipHorizontal}
                  checked={mirroredMode}
                  onChange={toggleMirror}
                />
                <ToggleSwitch theme={theme}
                  label="Ghost Pacer"
                  description="Race against your personal best ghost."
                  icon={Ghost}
                  checked={ghostPacer}
                  onChange={setGhostPacer}
                />
              </div>
            )}

            {activeTab === 'visuals' && (
              <div className="space-y-6">
                {/* Theme Section */}
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 tracking-wider uppercase mb-3 flex items-center gap-2">
                    <Palette size={14} style={{ color: `rgb(${theme.glowPrimary})` }} /> Color Theme
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {THEME_KEYS.map((key, idx) => {
                      const t = THEMES[key];
                      const isActive = idx === themeIndex;
                      return (
                        <button
                          key={key}
                          onClick={() => selectTheme(idx)}
                          style={
                            isActive
                              ? {
                                  borderColor: `rgba(${t.glowPrimary}, 0.55)`,
                                  backgroundColor: `rgba(${t.glowPrimary}, 0.12)`,
                                  boxShadow: `0 0 15px rgba(${t.glowPrimary}, 0.25)`,
                                }
                              : undefined
                          }
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                            isActive
                              ? 'border text-white'
                              : 'text-zinc-400 bg-white/[0.03] border border-white/5 hover:bg-white/[0.07] hover:border-white/15 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                              style={{
                                backgroundColor: `rgb(${t.glowPrimary})`,
                                boxShadow: `0 0 8px rgba(${t.glowPrimary}, 0.6)`,
                              }}
                            />
                            <span className="truncate capitalize">{t.name}</span>
                          </div>
                          {isActive && (
                            <Check
                              size={13}
                              className="shrink-0"
                              style={{ color: `rgb(${t.glowPrimary})` }}
                            />
                          )}
                        </button>
                      );
                    })}
                    
                    {/* Custom Wallpaper Special Button */}
                    <button
                      onClick={() => {
                        selectTheme(-1);
                        if (!wallpaperUrl && wallpaperInputRef.current) {
                          wallpaperInputRef.current.click();
                        }
                      }}
                      style={
                        themeIndex === -1
                          ? {
                              borderColor: `rgba(${wallpaperTheme?.glowPrimary || '56,189,248'}, 0.55)`,
                              backgroundColor: `rgba(${wallpaperTheme?.glowPrimary || '56,189,248'}, 0.12)`,
                              boxShadow: `0 0 15px rgba(${wallpaperTheme?.glowPrimary || '56,189,248'}, 0.25)`,
                            }
                          : undefined
                      }
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                        themeIndex === -1
                          ? 'border text-white'
                          : 'text-zinc-400 bg-white/[0.03] border border-white/5 hover:bg-white/[0.07] hover:border-white/15 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ImagePlus size={14} className={themeIndex === -1 ? 'text-cyan-300' : 'text-zinc-400'} />
                        <span className="truncate">Custom</span>
                      </div>
                      {themeIndex === -1 && (
                        <Check
                          size={13}
                          className="shrink-0"
                          style={{ color: `rgb(${wallpaperTheme?.glowPrimary || '56,189,248'})` }}
                        />
                      )}
                    </button>
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
                    <div className="mt-5 p-5 rounded-2xl bg-zinc-950/80 border border-white/10 flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 shadow-2xl backdrop-blur-xl">
                      
                      {/* Active Wallpaper Preview or Dropzone */}
                      {wallpaperUrl ? (
                        <div className="w-full relative h-40 rounded-2xl overflow-hidden border border-white/15 shadow-xl group">
                          <div
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                            style={{ backgroundImage: `url(${wallpaperUrl})` }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end justify-between p-4 backdrop-blur-[2px]">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                                Active Custom Wallpaper
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => wallpaperInputRef.current?.click()}
                                className="px-3.5 py-1.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md"
                              >
                                <UploadCloud size={13} /> Change Image
                              </button>
                              <button
                                onClick={() => { clearWallpaper(); selectTheme(0); }}
                                className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 rounded-xl transition-all cursor-pointer active:scale-95"
                                title="Remove Wallpaper"
                              >
                                <Trash2 size={14} />
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
                          className={`w-full h-36 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all gap-2.5 p-4 ${
                            isDragging
                              ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 scale-[1.01]'
                              : 'border-white/20 hover:border-white/40 hover:bg-white/[0.03] text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 shadow-inner">
                            <UploadCloud size={20} />
                          </div>
                          <div className="flex flex-col items-center text-center">
                            <span className="text-xs font-bold tracking-wider uppercase text-white">
                              Drop Your Wallpaper Image Here
                            </span>
                            <span className="text-[10px] text-zinc-400 mt-0.5">
                              or click to browse from device (4K & 8K supported via IndexedDB)
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Curated High-Res Wallpaper Presets */}
                      <div className="flex flex-col gap-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                          <Sparkles size={11} className="text-cyan-400" /> Curated High-Res Presets
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {CURATED_WALLPAPERS.map((preset) => {
                            const isCuratedActive = wallpaperUrl === preset.url;
                            return (
                              <button
                                key={preset.id}
                                onClick={() => {
                                  selectCuratedWallpaper?.(preset);
                                  selectTheme(-1);
                                }}
                                className={`relative h-20 rounded-xl overflow-hidden border text-left transition-all group cursor-pointer ${
                                  isCuratedActive
                                    ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-[1.02]'
                                    : 'border-white/10 hover:border-white/30 opacity-75 hover:opacity-100'
                                }`}
                              >
                                <div
                                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                  style={{ backgroundImage: `url(${preset.thumbnail})` }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                                <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-white truncate drop-shadow-md">
                                    {preset.name}
                                  </span>
                                  {isCuratedActive && (
                                    <Check size={12} className="text-cyan-400 shrink-0" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Visual Sliders: Brightness & Blur */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-white/5">
                        {/* Brightness Slider */}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                            <span className="flex items-center gap-1.5 text-zinc-400 uppercase text-[10px] tracking-wider">
                              <Sun size={12} className="text-amber-400" /> Brightness
                            </span>
                            <span className="font-mono text-cyan-300 text-[11px]">
                              {Math.round(brightness * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.2"
                            max="1.0"
                            step="0.05"
                            value={brightness}
                            onChange={(e) => setBrightness?.(parseFloat(e.target.value))}
                            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                          />
                        </div>

                        {/* Blur Slider */}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                            <span className="flex items-center gap-1.5 text-zinc-400 uppercase text-[10px] tracking-wider">
                              <Sliders size={12} className="text-purple-400" /> Ambient Blur
                            </span>
                            <span className="font-mono text-purple-300 text-[11px]">
                              {blur}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="16"
                            step="1"
                            value={blur}
                            onChange={(e) => setBlur?.(parseInt(e.target.value, 10))}
                            className="w-full accent-purple-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                          />
                        </div>
                      </div>

                      {/* Accent Palette Swatches */}
                      <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                          <Palette size={11} className="text-cyan-400" /> UI Neon Accent
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {ACCENT_SWATCHES.map((swatch) => {
                            const isSelected = customAccent === swatch.id;
                            return (
                              <button
                                key={swatch.id}
                                onClick={() => setCustomAccent?.(swatch.id)}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[11px] font-bold tracking-wide transition-all cursor-pointer border ${
                                  isSelected
                                    ? 'bg-white/10 border-white/40 text-white shadow-md'
                                    : 'bg-white/[0.03] border-white/5 text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                    style={{
                                      backgroundColor: swatch.color,
                                      boxShadow: isSelected ? `0 0 8px ${swatch.border}` : 'none',
                                    }}
                                  />
                                  <span className="truncate">{swatch.label}</span>
                                </div>
                                {isSelected && (
                                  <Check size={11} style={{ color: swatch.border }} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  )}
                </div>

                {/* Typography Section */}
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 tracking-wider uppercase mb-3 flex items-center gap-2">
                    <Settings size={14} style={{ color: `rgb(${theme.glowPrimary})` }} /> Typography Font
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      'JetBrains Mono', 'Fira Code', 'Roboto Mono', 'Space Mono', 'IBM Plex Mono',
                      'Courier New', 'Victor Mono', 'Share Tech Mono', 'Inconsolata', 'Pacifico'
                    ].map((fontName) => {
                      const isActive = fontName === themeFont;
                      return (
                        <button
                          key={fontName}
                          onClick={() => setThemeFont(fontName)}
                          style={{
                            fontFamily: `"${fontName}", monospace`,
                            ...(isActive
                              ? {
                                  borderColor: `rgba(${theme.glowPrimary}, 0.5)`,
                                  backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                                  color: `rgb(${theme.glowPrimary})`,
                                  boxShadow: `0 0 12px rgba(${theme.glowPrimary}, 0.2)`,
                                }
                              : {}),
                          }}
                          className={`px-3 py-2 rounded-xl border text-xs font-medium tracking-wide transition-all cursor-pointer text-center truncate ${
                            isActive
                              ? ''
                              : 'bg-white/[0.03] border-white/5 text-zinc-400 hover:bg-white/[0.07] hover:border-white/15 hover:text-zinc-200'
                          }`}
                          title={fontName}
                        >
                          {fontName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sound Profile Section */}
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 tracking-wider uppercase mb-3 flex items-center gap-2">
                    <Volume2 size={14} style={{ color: `rgb(${theme.glowPrimary})` }} /> Keystroke Sound
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {SOUND_KEYS.map((key) => {
                      const isActive = key === soundProfile;
                      return (
                        <button
                          key={key}
                          onClick={() => selectSoundProfile(key)}
                          style={
                            isActive
                              ? {
                                  borderColor: `rgba(${theme.glowPrimary}, 0.5)`,
                                  backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                                  color: `rgb(${theme.glowPrimary})`,
                                  boxShadow: `0 0 12px rgba(${theme.glowPrimary}, 0.2)`,
                                }
                              : undefined
                          }
                          className={`px-3 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center ${
                            isActive
                              ? ''
                              : 'bg-white/[0.03] border-white/5 text-zinc-400 hover:bg-white/[0.07] hover:border-white/15 hover:text-zinc-200'
                          }`}
                        >
                          {key}
                        </button>
                      );
                    })}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {SHADER_MODES.map((item) => {
                      const isActive = shaderConfig.mode === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => shaderConfig.setMode(item.id)}
                          style={
                            isActive
                              ? {
                                  borderColor: `rgba(${theme.glowPrimary}, 0.55)`,
                                  backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                                  boxShadow: `0 0 18px rgba(${theme.glowPrimary}, 0.25)`,
                                }
                              : undefined
                          }
                          className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            isActive
                              ? 'text-white'
                              : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.07] hover:border-white/15 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{item.icon}</span>
                              <span className="text-xs font-bold tracking-wide text-white">{item.name}</span>
                            </div>
                            {isActive && (
                              <Check
                                size={14}
                                className="shrink-0"
                                style={{ color: `rgb(${theme.glowPrimary})` }}
                              />
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">
                            {item.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Shader Speed & Interactivity Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                  {/* Speed Selector */}
                  <div className="flex flex-col p-4 rounded-2xl border border-white/5 bg-white/[0.03] justify-between gap-3">
                    <div>
                      <span className="font-bold tracking-wide text-sm text-white block">
                        Animation Flow Speed
                      </span>
                      <span className="text-[11px] font-medium text-zinc-500 mt-0.5 block leading-relaxed">
                        Control how fast the background ripples and drifts.
                      </span>
                    </div>
                    <div className="flex gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5">
                      {(['slow', 'normal', 'fast'] as ShaderSpeed[]).map((spd) => {
                        const isSpdActive = shaderConfig.speed === spd;
                        return (
                          <button
                            key={spd}
                            onClick={() => shaderConfig.setSpeed(spd)}
                            style={
                              isSpdActive
                                ? {
                                    borderColor: `rgba(${theme.glowPrimary}, 0.5)`,
                                    backgroundColor: `rgba(${theme.glowPrimary}, 0.18)`,
                                    color: `rgb(${theme.glowPrimary})`,
                                  }
                                : undefined
                            }
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              isSpdActive
                                ? 'border text-white shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            {spd}
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
              </div>
            )}

            {activeTab === 'system' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ToggleSwitch theme={theme}
                  label="Sticky Keys"
                  description="Force you to fix mistakes before continuing."
                  icon={Magnet}
                  checked={stickyKeysMode}
                  onChange={setStickyKeysMode}
                />
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="flex flex-col max-w-2xl mx-auto pb-4">

                <div className="mb-8">
                  <h4 className="text-sm font-black text-indigo-400 tracking-widest uppercase mb-2 flex items-center gap-2">
                    <Brain size={16} /> Triple Threat Architecture
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Configure your Universal BYOK (Bring Your Own Key) setup. The engine defaults to Groq, but you can plug in any OpenAI-compatible API. Your key is stored securely in your browser.
                  </p>
                </div>

                <div className="flex flex-col gap-5">
                  <div className={`flex flex-col gap-2 ${selectedProvider !== 'custom' && availableModels.length === 0 ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                    <label className="text-[10px] font-black tracking-widest text-zinc-500 uppercase flex items-center justify-between">
                      <span className="flex items-center gap-2"><Settings size={12} className={theme.text} /> Target Model ID</span>
                      {availableModels.length > 0 && <span className="text-emerald-500/70 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[8px]">LIVE FETCH</span>}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        disabled={selectedProvider !== 'custom' && availableModels.length === 0}
                        value={byokModel}
                        onChange={(e) => {
                          handleModelChange(e.target.value);
                          setIsModelDropdownOpen(true);
                        }}
                        onFocus={() => { if (availableModels.length > 0) setIsModelDropdownOpen(true); }}
                        placeholder="llama-3.3-70b-versatile"
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 pr-10 text-sm font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />
                      {availableModels.length > 0 && (
                        <button
                          onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white transition-colors"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
                        </button>
                      )}

                      {isModelDropdownOpen && availableModels.length > 0 && (
                        <div className="absolute top-full mt-2 w-full max-h-48 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-[100] overflow-hidden hide-scrollbar">
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
                                    className="px-4 py-3 flex items-center justify-between cursor-pointer transition-colors text-sm font-mono text-zinc-400 hover:bg-white/5 hover:text-white border-b border-white/5 last:border-0"
                                  >
                                    <span>{m}</span>
                                    {engineConfig.workingModels?.includes(m) && (
                                      <span className="text-[10px] text-emerald-400 font-sans tracking-widest uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                        ⭐ Working
                                      </span>
                                    )}
                                  </div>
                                ))}
                                {displayedModels.length === 0 && (
                                  <div className="px-4 py-3 text-sm font-mono text-zinc-600">No models match "{byokModel}"</div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                      Provider API Key <span className="text-indigo-400/50 normal-case tracking-normal font-medium ml-1">({PROVIDER_PRESETS.find(p => p.id === selectedProvider)?.label || 'Custom'} Key)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={byokKey}
                        onChange={(e) => handleKeyChange(e.target.value)}
                        placeholder="sk-..."
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 pr-24 text-sm font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />
                      <button
                        onClick={() => {
                          if (byokKey.trim()) {
                            toast.success('API Key saved securely to your browser.', { icon: '🔐' });
                          } else {
                            toast('Key cleared.', { icon: '🗑️' });
                          }
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Save
                      </button>
                    </div>
                    {isAmbiguousSk && (
                      <div className="mt-1 text-[10px] text-amber-500/80 flex items-center gap-1.5">
                        <AlertTriangle size={10} />
                        If this is an Anthropic key, you must use an OpenAI-compatible proxy (like OpenRouter). Direct Anthropic URLs are not supported.
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 transition-all duration-300">
                    <label className="text-[10px] font-black tracking-widest text-zinc-500 uppercase flex items-center justify-between">
                      <span>Base URL</span>
                      <span className="text-[8px] text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded border border-white/5 font-mono normal-case tracking-normal">
                        must end in /v1
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
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 pr-32 text-sm font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />

                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <button
                          onClick={() => setIsDropdownOpen(!_isDropdownOpen)}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 rounded-lg border border-white/5 transition-colors flex items-center gap-1.5"
                        >
                          {PROVIDER_PRESETS.find(p => p.id === selectedProvider)?.label || 'Custom'}
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${_isDropdownOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
                        </button>

                        {_isDropdownOpen && (
                          <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                            {PROVIDER_PRESETS.map((preset) => (
                              <button
                                key={preset.id}
                                onClick={() => {
                                  setSelectedProvider(preset.id);
                                  if (preset.url) {
                                    setByokUrl(preset.url);
                                    localStorage.setItem(AI_KEYS.byokUrl, preset.url);
                                  }
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors border-b border-white/5 last:border-0 hover:bg-white/5 ${selectedProvider === preset.id ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-400'}`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-1 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-start gap-3">
                    <Info size={16} className="text-sky-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-sky-200/70 leading-relaxed">
                      Don't have an API key? You can generate one for free on the{' '}
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 font-bold hover:text-sky-300 underline underline-offset-2 transition-colors"
                      >
                        Groq Developer Console
                      </a>.
                    </p>
                  </div>

                  {/* Connection Status Badges */}
                  {connectionStatus === 'testing' && (
                    <div className="mt-2 p-3 rounded-xl bg-zinc-500/10 border border-zinc-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                      <div className="w-4 h-4 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
                      <p className="text-xs text-zinc-400 font-bold">Validating Connection...</p>
                    </div>
                  )}
                  {connectionStatus === 'success' && (
                    <div className="mt-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                      <Check size={16} className="text-emerald-400 shrink-0" />
                      <p className="text-xs text-emerald-300/70 font-bold">Connected • Found {availableModels.length} models</p>
                    </div>
                  )}
                  {connectionStatus === 'error' && (
                    <div className="mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                      <Info size={16} className="text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300/70 leading-relaxed font-mono">
                        {connectionError}
                      </p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {activeTab === 'usage' && (
              <div className="flex flex-col max-w-2xl mx-auto h-full w-full">
                <div className="mb-8">
                  <h4 className="text-sm font-black text-teal-400 tracking-widest uppercase mb-2 flex items-center gap-2">
                    <BarChart size={16} /> Usage & Analytics
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Track the exact volume of AI generations processed locally on your machine. This dashboard helps you estimate your API consumption since BYOK billing cannot be fetched automatically.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 shrink-0">
                  <div className="bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-md rounded-2xl p-6 flex flex-col gap-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                    <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">Tokens Consumed</span>
                    <span className="text-4xl font-bold text-teal-400">{usageTokens.toLocaleString()}</span>
                  </div>

                  <div className="bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-md rounded-2xl p-6 flex flex-col gap-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                    <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">Total API Calls</span>
                    <span className="text-4xl font-bold text-indigo-400">{usageRequests.toLocaleString()}</span>
                  </div>
                </div>

                {/* Live Limits Module */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-8 shrink-0">
                  <div className="bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                    <div className="flex items-center gap-2 mb-4 relative z-10">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Provider Load (60s)</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 relative z-10">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase mb-1">Tokens / Min (TPM)</span>
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-bold text-blue-400">{rollingUsage.tokens.toLocaleString()}</span>
                          <span className="text-xs text-zinc-500 mb-1 font-bold">/ {activeLimits.tpm === Infinity ? 'No limit' : `~${activeLimits.tpm.toLocaleString()}`}</span>
                        </div>
                        <div className="w-full bg-zinc-800/50 rounded-full h-1 mt-2 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full transition-all duration-500"
                            style={{ width: `${activeLimits.tpm === Infinity ? 0 : Math.min(100, (rollingUsage.tokens / activeLimits.tpm) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col mt-2">
                        <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase mb-1">Requests / Min (RPM)</span>
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-bold text-blue-400">{rollingUsage.requests.toLocaleString()}</span>
                          <span className="text-xs text-zinc-500 mb-1 font-bold">/ {activeLimits.rpm === Infinity ? 'No limit' : `~${activeLimits.rpm.toLocaleString()}`}</span>
                        </div>
                        <div className="w-full bg-zinc-800/50 rounded-full h-1 mt-2 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full transition-all duration-500"
                            style={{ width: `${activeLimits.rpm === Infinity ? 0 : Math.min(100, (rollingUsage.requests / activeLimits.rpm) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                    <div className="flex items-center gap-2 mb-4 relative z-10">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Provider Load (Daily)</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 relative z-10">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase mb-1">Tokens / Day (TPD)</span>
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-bold text-amber-400">{dailyTokens.toLocaleString()}</span>
                          <span className="text-xs text-zinc-500 mb-1 font-bold">/ {activeLimits.tpd === Infinity ? 'No limit' : `~${activeLimits.tpd.toLocaleString()}`}</span>
                        </div>
                        <div className="w-full bg-zinc-800/50 rounded-full h-1 mt-2 overflow-hidden">
                          <div
                            className="bg-amber-500 h-full transition-all duration-500"
                            style={{ width: `${activeLimits.tpd === Infinity ? 0 : Math.min(100, (dailyTokens / activeLimits.tpd) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col mt-2">
                        <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase mb-1">Requests / Day (RPD)</span>
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-bold text-amber-400">{dailyRequests.toLocaleString()}</span>
                          <span className="text-xs text-zinc-500 mb-1 font-bold">/ {activeLimits.rpd === Infinity ? 'No limit' : `~${activeLimits.rpd.toLocaleString()}`}</span>
                        </div>
                        <div className="w-full bg-zinc-800/50 rounded-full h-1 mt-2 overflow-hidden">
                          <div
                            className="bg-amber-500 h-full transition-all duration-500"
                            style={{ width: `${activeLimits.rpd === Infinity ? 0 : Math.min(100, (dailyRequests / activeLimits.rpd) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Smart Recommendation Engine */}
                {(() => {
                  const tpdPercent = dailyTokens / activeLimits.tpd;
                  const rpdPercent = dailyRequests / activeLimits.rpd;

                  if (tpdPercent > 0.75 || rpdPercent > 0.75) {
                    const bottleneck = tpdPercent > rpdPercent ? 'tpd' : 'rpd';

                    // Prefer openai/gpt-oss-120b if it offers an upgrade, otherwise fallback to finding the largest multiplier
                    const TARGET = 'openai/gpt-oss-120b';
                    let alt = (GROQ_LIMITS[TARGET] && GROQ_LIMITS[TARGET][bottleneck] > activeLimits[bottleneck])
                      ? [TARGET, GROQ_LIMITS[TARGET]] as const
                      : Object.entries(GROQ_LIMITS).find(([, limits]) => limits[bottleneck] > activeLimits[bottleneck] * 2);

                    if (alt) {
                      const [altModel, altLimits] = alt;
                      const multiplier = Math.floor(altLimits[bottleneck] / activeLimits[bottleneck]);
                      return (
                        <div className="bg-zinc-900/50 border border-violet-500/30 backdrop-blur-md rounded-2xl p-4 mb-8 flex items-start gap-4 shadow-[0_0_20px_rgba(139,92,246,0.1)] shrink-0 animate-fade-in">
                          <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-1">
                            <span className="text-violet-400 text-lg">💡</span>
                          </div>
                          <div>
                            <h4 className="text-[11px] font-black tracking-widest text-violet-400 uppercase mb-1">Smart Engine Tip</h4>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                              You're running hot on your daily {bottleneck.toUpperCase()} limit! Switch to <strong className="text-zinc-200">{altModel}</strong> in the Smart Engine tab to get <strong className="text-violet-300">{multiplier}x more</strong> daily allowance.
                            </p>
                          </div>
                        </div>
                      );
                    }
                  }
                  return null;
                })()}

                <div className="bg-zinc-900/30 border border-emerald-500/20 backdrop-blur-md rounded-2xl p-6 flex items-center justify-between gap-4 mb-auto relative overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.05)] shrink-0">
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-emerald-500/5 blur-2xl pointer-events-none" />
                  <div className="flex flex-col gap-1 relative z-10">
                    <span className="text-[10px] font-black tracking-widest text-emerald-500/70 uppercase">Estimated Money Saved</span>
                    <span className="text-xs text-zinc-400">Calculated at standard $0.50 per 1M tokens</span>
                  </div>
                  <span className="text-3xl font-black text-emerald-400 shadow-emerald-500/20 drop-shadow-lg relative z-10">
                    ${((usageTokens / 1000000) * 0.50).toFixed(4)}
                  </span>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={resetUsageStats}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase text-red-500/70 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
                  >
                    <RotateCcw size={12} /> Reset Stats
                  </button>
                </div>
              </div>
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

                <div className="flex items-center gap-4 mb-8">
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800/50 border border-white/10 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer transition-all">
                    <ImagePlus size={16} />
                    {reportFile ? 'Screenshot Attached' : 'Attach Screenshot'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setReportFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                  {reportFile && (
                    <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-2">
                      {reportFile.name}
                      <button onClick={() => setReportFile(null)} className="text-red-400 hover:text-red-300">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {reportStatus === 'error' && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-bold text-red-400 text-center">
                    Failed to submit report. Please try again.
                  </div>
                )}

                {reportStatus === 'success' && (
                  <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-400 text-center flex items-center justify-center gap-2">
                    <Check size={16} /> Report submitted successfully! Thank you.
                  </div>
                )}

                <button
                  disabled={!reportMsg.trim() || reportStatus === 'submitting' || reportStatus === 'success'}
                  onClick={async () => {
                    if (!reportMsg.trim() || !supabase) return;
                    setReportStatus('submitting');
                    try {
                      let screenshot_url = null;
                      if (reportFile) {
                        const fileExt = reportFile.name.split('.').pop();
                        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;

                        const { data: uploadData, error: uploadError } = await supabase.storage
                          .from('bug-reports')
                          .upload(fileName, reportFile);

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
                      if (reportTimeoutRef.current) clearTimeout(reportTimeoutRef.current);
                      reportTimeoutRef.current = setTimeout(() => setReportStatus('idle'), 3000);
                    } catch (e) {
                      console.error("Bug report failed:", e);
                      setReportStatus('error');
                    }
                  }}
                  className="w-full py-4 rounded-xl font-black tracking-widest uppercase text-xs transition-all flex items-center justify-center gap-2 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reportStatus === 'submitting' ? <Loader2 size={16} className="animate-spin" /> : 'Submit Report'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
