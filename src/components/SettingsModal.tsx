import React, { useState, useEffect } from 'react';
import { X, Settings, Skull, Ghost, Brain, FlipHorizontal, CloudFog, Magnet, Timer, LayoutGrid, Palette, Volume2, Check, Bug, ImagePlus, Loader2, RotateCcw, Info, BarChart, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { THEMES, THEME_KEYS, SOUND_KEYS } from '@/data/constants';
import type { Theme } from '@/data/constants';
import { toast } from 'sonner';
import { SupportTechnician } from '@/components/SupportTechnician';

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
}

export interface ToggleSwitchProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: React.ElementType;
  danger?: boolean;
  theme: Theme;
}

export const ToggleSwitch = ({ label, description, checked, onChange, icon: Icon, danger = false, theme }: ToggleSwitchProps) => (
  <div 
    onClick={() => onChange(!checked)}
    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
      checked 
        ? danger ? 'bg-red-500/10 border-red-500/30 shadow-[inset_0_0_20px_rgba(239,68,68,0.1)]' : `bg-white/10 ${theme.borderHalf} shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]`
        : 'bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-800/80 hover:border-zinc-700'
    }`}
  >
    <div className="flex items-center gap-4">
      <div className={`p-2.5 rounded-xl ${
        checked 
          ? danger ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white' 
          : 'bg-zinc-800 text-zinc-400'
      }`}>
        <Icon size={20} />
      </div>
      <div className="flex flex-col">
        <span className={`font-black uppercase tracking-widest text-sm ${checked ? (danger ? 'text-red-400' : 'text-white') : 'text-zinc-400'}`}>
          {label}
        </span>
        <span className="text-[11px] font-medium text-zinc-500 mt-0.5 max-w-[250px] leading-relaxed">
          {description}
        </span>
      </div>
    </div>
    
    {/* Switch Track */}
    <div className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
      checked ? (danger ? 'bg-red-500/50' : 'bg-white/30') : 'bg-zinc-800'
    }`}>
      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
        checked ? 'translate-x-6 shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'translate-x-0'
      }`} />
    </div>
  </div>
);

const PROVIDER_PRESETS = [
  { id: 'groq', label: 'Groq', url: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  { id: 'openrouter', label: 'OpenRouter', url: 'https://openrouter.ai/api/v1', model: 'anthropic/claude-3-haiku' },
  { id: 'google', label: 'Google AI Studio', url: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-1.5-flash' },
  { id: 'kimi', label: 'Kimi', url: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { id: 'glm', label: 'Zhipu AI', url: 'https://open.bigmodel.cn/api/paas/v4/', model: 'glm-4' },
  { id: 'minimax', label: 'Minimax', url: 'https://api.minimax.chat/v1', model: 'minimax-text-01' },
  { id: 'openai', label: 'OpenAI', url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { id: 'custom', label: 'Custom Endpoint', url: '', model: '' }
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
  themeFont, setThemeFont
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'gameplay' | 'visuals' | 'system' | 'ai' | 'usage' | 'report'>('visuals');
  
  // AI Settings State
  const [byokKey, setByokKey] = useState(() => localStorage.getItem('typezen_byok_key') || '');
  const [byokUrl, setByokUrl] = useState(() => localStorage.getItem('typezen_byok_url') || 'https://api.groq.com/openai/v1');
  const [byokModel, setByokModel] = useState(() => localStorage.getItem('typezen_byok_model') || 'llama-3.3-70b-versatile');

  const [selectedProvider, setSelectedProvider] = useState(() => {
    const savedUrl = localStorage.getItem('typezen_byok_url') || 'https://api.groq.com/openai/v1';
    const preset = PROVIDER_PRESETS.find(p => p.url === savedUrl && p.id !== 'custom');
    return preset ? preset.id : 'custom';
  });
  const [_isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAmbiguousSk, setIsAmbiguousSk] = useState(false);
  const [_showGlow, setShowGlow] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  // Usage Tracker State
  const [usageTokens, setUsageTokens] = useState(() => parseInt(localStorage.getItem('typenova_usage_tokens') || '0', 10));
  const [usageRequests, setUsageRequests] = useState(() => parseInt(localStorage.getItem('typenova_usage_requests') || '0', 10));
  const [dailyTokens, setDailyTokens] = useState(() => parseInt(localStorage.getItem('typenova_daily_tokens') || '0', 10));
  const [dailyRequests, setDailyRequests] = useState(() => parseInt(localStorage.getItem('typenova_daily_requests') || '0', 10));
  const [rollingUsage, setRollingUsage] = useState({ tokens: 0, requests: 0 });

  const GROQ_LIMITS: Record<string, { rpm: number; rpd: number; tpm: number; tpd: number }> = {
    'allam-2-7b': { rpm: 30, rpd: 7000, tpm: 6000, tpd: 500000 },
    'groq/compound': { rpm: 30, rpd: 250, tpm: 70000, tpd: Infinity },
    'groq/compound-mini': { rpm: 30, rpd: 250, tpm: 70000, tpd: Infinity },
    'llama-3.1-8b-instant': { rpm: 30, rpd: 14400, tpm: 6000, tpd: 500000 },
    'llama-3.3-70b-versatile': { rpm: 30, rpd: 1000, tpm: 12000, tpd: 100000 },
    'meta-llama/llama-prompt-guard-2-22m': { rpm: 30, rpd: 14400, tpm: 15000, tpd: 500000 },
    'meta-llama/llama-prompt-guard-2-86m': { rpm: 30, rpd: 14400, tpm: 15000, tpd: 500000 },
    'openai/gpt-oss-120b': { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200000 },
    'openai/gpt-oss-20b': { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200000 },
    'openai/gpt-oss-safeguard-20b': { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200000 },
    'qwen/qwen3.6-27b': { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200000 },
    // Fallbacks
    'llama3-70b-8192': { rpm: 30, rpd: 14400, tpm: 6000, tpd: 500000 },
    'llama3-8b-8192': { rpm: 30, rpd: 14400, tpm: 30000, tpd: 500000 },
    'mixtral-8x7b-32768': { rpm: 30, rpd: 14400, tpm: 5000, tpd: 500000 },
    'gemma2-9b-it': { rpm: 30, rpd: 14400, tpm: 15000, tpd: 500000 }
  };
  const activeLimits = GROQ_LIMITS[byokModel] || { rpm: 30, rpd: 1000, tpm: 6000, tpd: 100000 };

  useEffect(() => {
    const updateRolling = () => {
      try {
        const history: { ts: number; t: number; r: number }[] = JSON.parse(localStorage.getItem('typenova_rolling_history') || '[]');
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

    const handleStorage = () => {
      setUsageTokens(parseInt(localStorage.getItem('typenova_usage_tokens') || '0', 10));
      setUsageRequests(parseInt(localStorage.getItem('typenova_usage_requests') || '0', 10));
      setDailyTokens(parseInt(localStorage.getItem('typenova_daily_tokens') || '0', 10));
      setDailyRequests(parseInt(localStorage.getItem('typenova_daily_requests') || '0', 10));
      updateRolling();
    };
    
    // Update immediately, on storage events, and decay every second
    updateRolling();
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(updateRolling, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const testConnection = async (keyToUse = byokKey, urlToUse = byokUrl) => {
    if (!keyToUse.trim()) return;
    setConnectionStatus('testing');
    setConnectionError('');
    try {
      const baseUrl = urlToUse.replace(/\/chat\/completions\/?$/, '').replace(/\/models\/?$/, '');
      const endpoint = baseUrl.endsWith('/') ? `${baseUrl}models` : `${baseUrl}/models`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${keyToUse}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        let errData = 'API Error';
        try {
          const errObj = await response.json();
          errData = errObj?.error?.message || errObj?.error || `HTTP ${response.status}`;
        } catch {
          errData = `HTTP ${response.status}`;
        }
        throw new Error(errData);
      }
      
      const data = await response.json();
      if (data && data.data && Array.isArray(data.data)) {
        const models = data.data.map((m: any) => m.id);
        setAvailableModels(models);
        setConnectionStatus('success');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      setConnectionStatus('error');
      setConnectionError(err.message || 'Connection failed');
    }
  };

  useEffect(() => {
    if (!byokKey.trim()) {
      setConnectionStatus('idle');
      return;
    }
    const timer = setTimeout(() => {
      testConnection(byokKey, byokUrl);
    }, 800);
    return () => clearTimeout(timer);
  }, [byokKey, byokUrl]);

  const handleProviderSelect = (id: string) => {
    setSelectedProvider(id);
    const preset = PROVIDER_PRESETS.find(p => p.id === id);
    if (preset && id !== 'custom') {
      setByokUrl(preset.url);
      localStorage.setItem('typezen_byok_url', preset.url);
      setByokModel(preset.model);
      localStorage.setItem('typezen_byok_model', preset.model);
    }
    setIsDropdownOpen(false);
  };

  const handleKeyChange = (val: string) => { 
    setByokKey(val); 
    localStorage.setItem('typezen_byok_key', val); 
    
    let newProviderId = selectedProvider;
    
    if (val.startsWith('gsk_')) newProviderId = 'groq';
    else if (val.startsWith('sk-or-')) newProviderId = 'openrouter';
    else if (val.startsWith('AIza')) newProviderId = 'google';
    else if (val.includes('.')) newProviderId = 'glm';
    else if (val.startsWith('eyJ')) newProviderId = 'minimax';
    else if (val.startsWith('sk-')) {
      if (selectedProvider !== 'kimi' && selectedProvider !== 'minimax') {
        newProviderId = 'openai';
        setIsAmbiguousSk(true);
      } else {
        setIsAmbiguousSk(false);
      }
    } else {
      setIsAmbiguousSk(false);
    }

    if (newProviderId !== selectedProvider) {
      handleProviderSelect(newProviderId);
      setShowGlow(true);
      setTimeout(() => setShowGlow(false), 1500);
    }
  };
  const handleModelChange = (val: string) => {
    setByokModel(val);
    localStorage.setItem('typezen_byok_model', val);
  };
  
  // Bug Report State
  const [reportMsg, setReportMsg] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportStatus, setReportStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-6 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      
      {/* Modal Container */}
      <div 
        className="bg-zinc-900/95 w-full max-w-4xl h-[75vh] rounded-3xl border border-white/5 shadow-2xl flex overflow-hidden lucid-scale"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Left Sidebar */}
        <div className="w-64 border-r border-white/5 bg-black/20 flex flex-col p-6 relative">
          <div className="flex items-center gap-3 mb-10">
            <Settings size={24} className={theme.text} />
            <h2 className="text-xl font-black tracking-widest uppercase text-white">Settings</h2>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab('gameplay')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all ${
                activeTab === 'gameplay' ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              <Skull size={16} /> Gameplay
            </button>
            <button
              onClick={() => setActiveTab('visuals')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all ${
                activeTab === 'visuals' ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              <Palette size={16} /> Audio & Visuals
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all ${
                activeTab === 'system' ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              <LayoutGrid size={16} /> System
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all ${
                activeTab === 'ai' ? `bg-indigo-500/10 text-indigo-400 border border-indigo-500/20` : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              <Brain size={16} /> Smart Engine
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all ${
                activeTab === 'usage' ? `bg-teal-500/10 text-teal-400 border border-teal-500/20` : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              <BarChart size={16} /> Local AI Stats
            </button>
            <div className="my-2 border-t border-white/5" />
            <button
              onClick={() => setActiveTab('report')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all ${
                activeTab === 'report' ? `bg-red-500/10 text-red-400 border border-red-500/20` : 'text-red-500/50 hover:text-red-400 hover:bg-red-500/5 border border-transparent'
              }`}
            >
              <Bug size={16} /> Report Issue
            </button>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col relative bg-transparent">
          
          <div className="absolute top-6 right-6 z-10">
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="px-10 py-8 border-b border-white/5">
            <h3 className="text-2xl font-black tracking-widest uppercase text-white">
              {activeTab} Parameters
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            
            {activeTab === 'gameplay' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <>
              <div className="mt-8 mb-4">
                <h4 className="text-sm font-black text-white tracking-widest uppercase mb-1 flex items-center gap-2"><Palette size={16} className={theme.text} /> Theme</h4>
                <p className="text-xs text-zinc-500 mb-4">Select the application color scheme.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {THEME_KEYS.map((key, idx) => {
                     const t = THEMES[key];
                     const isActive = idx === themeIndex;
                     return (
                       <button
                         key={key}
                         onClick={() => selectTheme(idx)}
                         className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isActive ? `bg-white/10 ${t.vividText} border border-white/20` : 'text-zinc-400 bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-800/80 hover:text-zinc-200'}`}
                       >
                         <div className="flex items-center gap-3">
                           <div className={`w-3 h-3 rounded-full shadow-inner border border-white/10 ${t.solid}`} />
                           {t.name}
                         </div>
                         {isActive && <Check size={14} className={t.vividText} />}
                       </button>
                     );
                  })}
                </div>
              </div>

              <div className="mt-8 mb-4">
                <h4 className="text-sm font-black text-white tracking-widest uppercase mb-1 flex items-center gap-2"><Settings size={16} className={theme.text} /> Typography</h4>
                <p className="text-xs text-zinc-500 mb-4">Select the application typeface.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    'JetBrains Mono', 'Fira Code', 'Roboto Mono', 'Space Mono', 'IBM Plex Mono', 'Courier New',
                    'Victor Mono', 'Share Tech Mono', 'Inconsolata', 'Pacifico'
                  ].map((fontName) => {
                    const isActive = fontName === themeFont;
                    return (
                      <button
                        key={fontName}
                        onClick={() => setThemeFont(fontName)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isActive
                            ? `bg-white/10 ${theme.borderHalf} shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]`
                            : 'bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-800/80 hover:border-zinc-700'
                        }`}
                        style={{ fontFamily: `"${fontName}", monospace` }}
                      >
                        <span className={`text-[11px] font-black tracking-wider ${isActive ? theme.text : 'text-zinc-400'}`}>
                          {fontName}
                        </span>
                        {isActive && <Check size={14} className={theme.text} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 mb-4">
                <h4 className="text-sm font-black text-white tracking-widest uppercase mb-1 flex items-center gap-2"><Volume2 size={16} className={theme.text} /> Sound Profile</h4>
                <p className="text-xs text-zinc-500 mb-4">Select the keystroke sound effect.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {SOUND_KEYS.map((key) => {
                     const isActive = key === soundProfile;
                     return (
                       <button
                         key={key}
                         onClick={() => selectSoundProfile(key)}
                         className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isActive ? `bg-white/10 ${theme.vividText} border border-white/20` : 'text-zinc-400 bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-800/80 hover:text-zinc-200'}`}
                       >
                         <div className="flex items-center gap-3">
                           <div className={`w-3 h-3 rounded-full shadow-inner border border-white/10 ${isActive ? theme.solid : 'bg-zinc-600'}`} />
                           {key}
                         </div>
                         {isActive && <Check size={14} className={theme.vividText} />}
                       </button>
                     );
                  })}
                </div>
              </div>
              </>
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
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
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
                                    className="px-4 py-3 cursor-pointer transition-colors text-sm font-mono text-zinc-400 hover:bg-white/5 hover:text-white border-b border-white/5 last:border-0"
                                  >
                                    {m}
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
                          localStorage.setItem('typezen_byok_url', e.target.value);
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
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${_isDropdownOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
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
                                    localStorage.setItem('typezen_byok_url', preset.url);
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

                <div className="mt-8 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex flex-col gap-2">
                  <h5 className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">Fallback Hierarchy</h5>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    <span className="text-indigo-300">Tier 1:</span> Cloud API (if configured above)<br/>
                    <span className="text-zinc-400">Tier 2:</span> Local window.ai (Gemini Nano)<br/>
                    <span className="text-zinc-500">Tier 3:</span> Procedural Markov-chain
                  </p>
                </div>

                <SupportTechnician />
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
                      : Object.entries(GROQ_LIMITS).find(([m, limits]) => limits[bottleneck] > activeLimits[bottleneck] * 2);
                    
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
                    onClick={() => {
                      localStorage.setItem('typenova_usage_tokens', '0');
                      localStorage.setItem('typenova_usage_requests', '0');
                      setUsageTokens(0);
                      setUsageRequests(0);
                      toast.success('Local usage stats reset.');
                    }}
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
                      setTimeout(() => setReportStatus('idle'), 3000);
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
