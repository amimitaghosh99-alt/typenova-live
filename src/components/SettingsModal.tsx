import React, { useState } from 'react';
import { X, Settings, Skull, Ghost, Brain, FlipHorizontal, CloudFog, Magnet, Timer, LayoutGrid, Palette, Volume2, Check, Bug, ImagePlus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { THEMES, THEME_KEYS, SOUND_KEYS } from '@/data/constants';
import type { Theme } from '@/data/constants';

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
  soundProfile, selectSoundProfile
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'gameplay' | 'visuals' | 'system' | 'report'>('visuals');
  
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
