import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Dices,
  Sparkles,
  RotateCcw,
  Check,
  CheckCircle2,
  Download,
  Flame,
  Bot,
  Cat,
} from 'lucide-react';
import {
  type ArtisanConfig,
  type KeycapProfile,
  type KeycapMaterialType,
  type EyeStyle,
  type MouthStyle,
  type AccessoryStyle,
  PROFILES,
  MATERIALS,
  RESIN_COLORS,
  FACE_INKS,
  EYE_STYLES,
  MOUTH_STYLES,
  ACCESSORY_STYLES,
  DEFAULT_ARTISAN,
  loadArtisanConfig,
  saveArtisanConfig,
  generateRandomArtisan,
} from '@/data/artisanCustomizer';
import { ArtisanKeycapSvg } from './ArtisanKeycapSvg';

interface ArtisanStudioTabProps {
  onStageCustomArtisan: (config: ArtisanConfig) => void;
  isCurrentlyStaged: boolean;
  accentGlow?: string; // RGB triplet string, e.g. "6, 182, 212"
}

// Quick Archetype Presets for instant fun and inspiration
const PRESET_ARCHETYPES: Array<{
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  config: Partial<ArtisanConfig>;
}> = [
  {
    id: 'mochi',
    label: 'Mochi Neko',
    icon: Cat,
    config: {
      name: 'Mochi Neko',
      profile: 'sa',
      material: 'metallic',
      resinColor: '#f97316',
      faceInk: '#18181b',
      eyes: 'dot',
      mouth: 'cat',
      accessory: 'catears',
      hasBlush: true,
    },
  },
  {
    id: 'oni',
    label: 'Cyber Oni',
    icon: Flame,
    config: {
      name: 'Cyber Oni',
      profile: 'cherry',
      material: 'metallic',
      resinColor: '#1e293b',
      faceInk: '#ffffff',
      eyes: 'angry',
      mouth: 'open',
      accessory: 'horns',
      hasBlush: false,
    },
  },
  {
    id: 'star',
    label: 'Starlight',
    icon: Sparkles,
    config: {
      name: 'Starlight Neko',
      profile: 'sa',
      material: 'glossy',
      resinColor: '#6366f1',
      faceInk: '#ffffff',
      eyes: 'star',
      mouth: 'smile',
      accessory: 'sparkles',
      hasBlush: true,
    },
  },
  {
    id: 'mecha',
    label: 'Mecha-01',
    icon: Bot,
    config: {
      name: 'Mecha-01',
      profile: 'dome',
      material: 'translucent',
      resinColor: '#10b981',
      faceInk: '#18181b',
      eyes: 'sleepy',
      mouth: 'flat',
      accessory: 'antenna',
      hasBlush: false,
    },
  },
];

export const ArtisanStudioTab = React.memo(function ArtisanStudioTab({
  onStageCustomArtisan,
  isCurrentlyStaged,
  accentGlow = '6, 182, 212',
}: ArtisanStudioTabProps) {
  const [config, setConfig] = useState<ArtisanConfig>(loadArtisanConfig);
  const [stagedPulse, setStagedPulse] = useState(false);
  const [exported, setExported] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // Auto-save whenever config changes
  useEffect(() => {
    saveArtisanConfig(config);
  }, [config]);

  const update = useCallback(<K extends keyof ArtisanConfig>(key: K, val: ArtisanConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: val }));
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(6);
      }
    } catch {}
  }, []);

  const handleRandomize = useCallback(() => {
    const random = generateRandomArtisan();
    setConfig(random);
  }, []);

  const handleReset = useCallback(() => {
    setConfig({ ...DEFAULT_ARTISAN });
  }, []);

  const handleApplyPreset = useCallback((presetConfig: Partial<ArtisanConfig>) => {
    setConfig((prev) => ({ ...prev, ...presetConfig }));
  }, []);

  const handleStage = useCallback(() => {
    onStageCustomArtisan(config);
    setStagedPulse(true);
    setTimeout(() => setStagedPulse(false), 1200);
  }, [config, onStageCustomArtisan]);

  // Download keycap as standalone SVG vector file
  const handleExportSvg = useCallback(() => {
    if (!stageRef.current) return;
    const svgEl = stageRef.current.querySelector('svg');
    if (!svgEl) return;

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-artisan.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExported(true);
    setTimeout(() => setExported(false), 2000);
  }, [config.name]);

  // Serial code for edition aesthetic
  const serialCode = `TN-${config.profile.toUpperCase()}-${config.material.slice(0, 3).toUpperCase()}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* ── LEFT COLUMN: Keycap Stage & Live View ── */}
      <div className="lg:col-span-5 flex flex-col items-center justify-between rounded-2xl border border-white/10 bg-black/50 backdrop-blur-2xl p-5 shadow-2xl relative overflow-hidden">
        {/* Dynamic Theme Glow Bloom */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-35 transition-all duration-700"
          style={{
            background: `radial-gradient(circle at 50% 45%, ${config.resinColor}65 0%, transparent 68%)`,
          }}
        />

        {/* Top Bar: Name & Serial Badges */}
        <div className="w-full flex items-center justify-between gap-3 border-b border-white/10 pb-3 mb-2">
          <input
            type="text"
            value={config.name}
            onChange={(e) => update('name', e.target.value.slice(0, 20))}
            placeholder="Keycap Name..."
            className="bg-transparent text-white font-bold text-base sm:text-lg focus:outline-none border-b border-transparent focus:border-white/30 transition-colors w-full font-mono tracking-tight"
            maxLength={20}
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-mono text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/50 hidden sm:inline">
              {serialCode}
            </span>
            <span
              className="font-mono text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border"
              style={{
                borderColor: `rgba(${accentGlow}, 0.5)`,
                backgroundColor: `rgba(${accentGlow}, 0.15)`,
                color: `rgb(${accentGlow})`,
              }}
            >
              1 OF 1
            </span>
          </div>
        </div>

        {/* Hero Interactive Keycap Stage with Mechanical Floating Pedestal */}
        <div
          ref={stageRef}
          className="relative my-4 flex items-center justify-center p-6 w-full min-h-[260px]"
        >
          {/* Holographic Turntable Pedestal Base */}
          <div className="absolute bottom-5 flex flex-col items-center justify-center pointer-events-none">
            {/* Outer Radial Ring */}
            <div
              className="w-48 h-12 rounded-full border border-dashed transition-all duration-500 opacity-45"
              style={{
                borderColor: `rgba(${accentGlow}, 0.5)`,
                boxShadow: `0 0 24px rgba(${accentGlow}, 0.25)`,
                transform: 'rotateX(68deg)',
              }}
            />
            {/* Inner Glowing Core */}
            <div
              className="w-28 h-7 -mt-9 rounded-full border transition-all duration-500 opacity-60"
              style={{
                borderColor: `${config.resinColor}80`,
                backgroundColor: `${config.resinColor}15`,
                transform: 'rotateX(68deg)',
              }}
            />
          </div>

          {/* Floating Keycap Vector */}
          <motion.div
            animate={{ y: [-4, 4, -4] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            whileHover={{ scale: 1.04 }}
            className="relative cursor-grab active:cursor-grabbing"
          >
            <ArtisanKeycapSvg config={config} size={210} showUnderglow />
          </motion.div>
        </div>

        {/* Quick Archetype Presets */}
        <div className="w-full pt-1 pb-3 flex items-center justify-center gap-1.5 flex-wrap">
          <span className="font-mono text-[8px] uppercase tracking-widest text-white/40 mr-1">
            Presets:
          </span>
          {PRESET_ARCHETYPES.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.config)}
                className="py-1 px-2 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-mono text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
              >
                <Icon size={11} />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="w-full flex flex-col gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={handleStage}
            style={{
              backgroundColor: isCurrentlyStaged
                ? 'rgba(16, 185, 129, 0.22)'
                : `rgba(${accentGlow}, 0.26)`,
              borderColor: isCurrentlyStaged
                ? 'rgba(16, 185, 129, 0.65)'
                : `rgba(${accentGlow}, 0.6)`,
              boxShadow: `0 0 24px rgba(${accentGlow}, 0.35)`,
            }}
            className="w-full py-2.5 px-4 rounded-xl font-mono text-xs font-black uppercase tracking-wider text-white border flex items-center justify-center gap-2 hover:brightness-115 active:scale-[0.98] transition-all cursor-pointer shadow-lg"
          >
            {isCurrentlyStaged ? (
              <>
                <CheckCircle2 size={15} className="text-emerald-400" />
                <span>Custom Keycap Staged</span>
              </>
            ) : stagedPulse ? (
              <>
                <Check size={15} />
                <span>Staged to Loadout!</span>
              </>
            ) : (
              <>
                <Sparkles size={15} style={{ color: `rgb(${accentGlow})` }} />
                <span>Stage as Loadout Avatar</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleRandomize}
              className="py-2 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Dices size={13} style={{ color: `rgb(${accentGlow})` }} />
              <span>Random</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="py-2 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-zinc-200 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={handleExportSvg}
              title="Save keycap vector file"
              className="py-2 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Download size={12} />
              <span>{exported ? 'Saved!' : 'Export'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN: Customization Matrix ── */}
      <div className="lg:col-span-7 flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-2xl p-5 shadow-2xl overflow-y-auto max-h-[640px] custom-scrollbar">
        {/* 1. PROFILE */}
        <div>
          <div className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1.5 flex items-center justify-between">
            <span>Profile</span>
            <span className="text-zinc-500 font-normal uppercase text-[9px]">
              {config.profile === 'sa' ? 'Spherical Sculpted' : config.profile === 'cherry' ? 'Cylindrical Chamfered' : 'Ergonomic Dome'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {PROFILES.map((p) => {
              const active = config.profile === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => update('profile', p.id as KeycapProfile)}
                  style={
                    active
                      ? {
                          backgroundColor: `rgba(${accentGlow}, 0.22)`,
                          borderColor: `rgba(${accentGlow}, 0.75)`,
                          color: '#ffffff',
                          boxShadow: `0 0 16px rgba(${accentGlow}, 0.35)`,
                        }
                      : undefined
                  }
                  className={`py-2 px-3 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer border ${
                    active
                      ? ''
                      : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. MATERIAL */}
        <div>
          <div className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1.5 flex items-center justify-between">
            <span>Material Finish</span>
            <span className="text-zinc-500 font-normal uppercase text-[9px]">
              {config.material === 'metallic'
                ? 'Anodized Chrome'
                : config.material === 'glossy'
                ? 'Liquid Glass'
                : config.material === 'translucent'
                ? 'Frosted Jelly'
                : 'Diffuse Matte'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {MATERIALS.map((m) => {
              const active = config.material === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => update('material', m.id as KeycapMaterialType)}
                  style={
                    active
                      ? {
                          backgroundColor: `rgba(${accentGlow}, 0.22)`,
                          borderColor: `rgba(${accentGlow}, 0.75)`,
                          color: '#ffffff',
                          boxShadow: `0 0 16px rgba(${accentGlow}, 0.35)`,
                        }
                      : undefined
                  }
                  className={`py-2 px-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer border truncate text-center ${
                    active
                      ? ''
                      : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. RESIN COLOR SWATCHES */}
        <div>
          <div className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1.5 flex items-center justify-between">
            <span>Resin Color</span>
            <span className="text-white/80 font-bold font-mono text-[10px]">
              {RESIN_COLORS.find((c) => c.hex.toLowerCase() === config.resinColor.toLowerCase())?.name || config.resinColor}
            </span>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
            {RESIN_COLORS.map((c) => {
              const active = config.resinColor.toLowerCase() === c.hex.toLowerCase();
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => update('resinColor', c.hex)}
                  title={c.name}
                  style={{
                    backgroundColor: c.hex,
                    boxShadow: active ? `0 0 14px ${c.hex}` : undefined,
                  }}
                  className={`h-7 w-7 rounded-full transition-all cursor-pointer relative flex items-center justify-center ${
                    active
                      ? 'scale-115 ring-2 ring-white ring-offset-2 ring-offset-black z-10'
                      : 'hover:scale-105 opacity-85 hover:opacity-100'
                  }`}
                >
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-white drop-shadow-md" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. FACE INK SWATCHES */}
        <div>
          <div className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1.5 flex items-center justify-between">
            <span>Face Ink</span>
            <span className="text-white/80 font-bold font-mono text-[10px]">
              {FACE_INKS.find((c) => c.hex.toLowerCase() === config.faceInk.toLowerCase())?.name || config.faceInk}
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {FACE_INKS.map((c) => {
              const active = config.faceInk.toLowerCase() === c.hex.toLowerCase();
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => update('faceInk', c.hex)}
                  title={c.name}
                  style={{
                    backgroundColor: c.hex,
                    boxShadow: active ? `0 0 12px ${c.hex}` : undefined,
                  }}
                  className={`h-7 w-7 rounded-full transition-all cursor-pointer border border-white/20 relative flex items-center justify-center ${
                    active
                      ? 'scale-115 ring-2 ring-white ring-offset-2 ring-offset-black z-10'
                      : 'hover:scale-105 opacity-85 hover:opacity-100'
                  }`}
                >
                  {active && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        c.id === 'white' ? 'bg-black' : 'bg-white'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. EYES */}
        <div>
          <div className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1.5">
            Eyes
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {EYE_STYLES.map((e) => {
              const active = config.eyes === e.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => update('eyes', e.id as EyeStyle)}
                  style={
                    active
                      ? {
                          backgroundColor: `rgba(${accentGlow}, 0.22)`,
                          borderColor: `rgba(${accentGlow}, 0.75)`,
                          color: '#ffffff',
                          boxShadow: `0 0 14px rgba(${accentGlow}, 0.35)`,
                        }
                      : undefined
                  }
                  className={`py-1.5 px-2 rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer border truncate text-center ${
                    active
                      ? ''
                      : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {e.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. MOUTH */}
        <div>
          <div className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1.5">
            Mouth
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {MOUTH_STYLES.map((m) => {
              const active = config.mouth === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => update('mouth', m.id as MouthStyle)}
                  style={
                    active
                      ? {
                          backgroundColor: `rgba(${accentGlow}, 0.22)`,
                          borderColor: `rgba(${accentGlow}, 0.75)`,
                          color: '#ffffff',
                          boxShadow: `0 0 14px rgba(${accentGlow}, 0.35)`,
                        }
                      : undefined
                  }
                  className={`py-1.5 px-2 rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer border truncate text-center ${
                    active
                      ? ''
                      : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 7. ACCESSORY & ROSY BLUSH */}
        <div>
          <div className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1.5 flex items-center justify-between">
            <span>Accessory & Cheeks</span>
            <button
              type="button"
              onClick={() => update('hasBlush', !config.hasBlush)}
              className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                config.hasBlush
                  ? 'bg-rose-500/25 text-rose-300 border-rose-400/60 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                  : 'bg-white/5 text-zinc-500 border-white/10 hover:text-zinc-300'
              }`}
            >
              <span>🌸</span>
              <span>Blush: {config.hasBlush ? 'ON' : 'OFF'}</span>
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {ACCESSORY_STYLES.map((a) => {
              const active = config.accessory === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => update('accessory', a.id as AccessoryStyle)}
                  style={
                    active
                      ? {
                          backgroundColor: `rgba(${accentGlow}, 0.22)`,
                          borderColor: `rgba(${accentGlow}, 0.75)`,
                          color: '#ffffff',
                          boxShadow: `0 0 14px rgba(${accentGlow}, 0.35)`,
                        }
                      : undefined
                  }
                  className={`py-2 px-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer border truncate text-center ${
                    active
                      ? ''
                      : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});
