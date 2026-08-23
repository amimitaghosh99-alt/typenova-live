import { useState, useEffect, useCallback } from 'react';

export type ShaderMode = 'liquid' | 'aurora' | 'grid' | 'matrix' | 'nebula' | 'minimal';
export type ShaderSpeed = 'slow' | 'normal' | 'fast';

export interface ShaderConfig {
  mode: ShaderMode;
  speed: ShaderSpeed;
  interactive: boolean;
  setMode: (mode: ShaderMode) => void;
  setSpeed: (speed: ShaderSpeed) => void;
  setInteractive: (interactive: boolean) => void;
}

const STORAGE_KEYS = {
  mode: 'typenova_shader_mode',
  speed: 'typenova_shader_speed',
  interactive: 'typenova_shader_interactive',
};

export const SHADER_MODES: { id: ShaderMode; name: string; desc: string; icon: string }[] = [
  {
    id: 'liquid',
    name: 'Cosmic Liquid',
    desc: 'Fluid caustic waves with organic ripples and smooth light refraction.',
    icon: '🌊',
  },
  {
    id: 'aurora',
    name: 'Aurora Borealis',
    desc: 'Undulating celestial light curtains drifting across the cosmic horizon.',
    icon: '🌌',
  },
  {
    id: 'grid',
    name: 'Cyber Warp Grid',
    desc: 'Retro-futuristic perspective grid with radiant horizon line pulses.',
    icon: '⚡',
  },
  {
    id: 'matrix',
    name: 'Matrix Stream',
    desc: 'Cascading columns of digital data streaks flowing downward.',
    icon: '📟',
  },
  {
    id: 'nebula',
    name: 'Deep Nebula',
    desc: 'Atmospheric volumetric stellar clouds and drifting cosmic dust.',
    icon: '☁️',
  },
  {
    id: 'minimal',
    name: 'Minimal Void',
    desc: 'Pure clean dark background with zero shader animations for total focus.',
    icon: '🌑',
  },
];

export function useShaderConfig(): ShaderConfig {
  const [mode, setModeState] = useState<ShaderMode>(() => {
    return (localStorage.getItem(STORAGE_KEYS.mode) as ShaderMode) || 'liquid';
  });

  const [speed, setSpeedState] = useState<ShaderSpeed>(() => {
    return (localStorage.getItem(STORAGE_KEYS.speed) as ShaderSpeed) || 'normal';
  });

  const [interactive, setInteractiveState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.interactive);
    return saved !== null ? saved === 'true' : true;
  });

  const notifyChange = useCallback(() => {
    window.dispatchEvent(new CustomEvent('shader_config_changed'));
  }, []);

  const setMode = useCallback((newMode: ShaderMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEYS.mode, newMode);
    notifyChange();
  }, [notifyChange]);

  const setSpeed = useCallback((newSpeed: ShaderSpeed) => {
    setSpeedState(newSpeed);
    localStorage.setItem(STORAGE_KEYS.speed, newSpeed);
    notifyChange();
  }, [notifyChange]);

  const setInteractive = useCallback((newInteractive: boolean) => {
    setInteractiveState(newInteractive);
    localStorage.setItem(STORAGE_KEYS.interactive, String(newInteractive));
    notifyChange();
  }, [notifyChange]);

  useEffect(() => {
    const handleStorage = () => {
      const savedMode = (localStorage.getItem(STORAGE_KEYS.mode) as ShaderMode) || 'liquid';
      const savedSpeed = (localStorage.getItem(STORAGE_KEYS.speed) as ShaderSpeed) || 'normal';
      const savedInteractive = localStorage.getItem(STORAGE_KEYS.interactive) !== 'false';
      setModeState(savedMode);
      setSpeedState(savedSpeed);
      setInteractiveState(savedInteractive);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('shader_config_changed', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('shader_config_changed', handleStorage);
    };
  }, []);

  return {
    mode,
    speed,
    interactive,
    setMode,
    setSpeed,
    setInteractive,
  };
}
