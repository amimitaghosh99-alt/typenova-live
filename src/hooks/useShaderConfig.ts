import { useState, useEffect, useCallback, useMemo } from 'react';

export type ShaderMode = 'liquid' | 'aurora' | 'grid' | 'matrix' | 'nebula' | 'minimal';
export type ShaderSpeed = 'slow' | 'normal' | 'fast';

export interface ShaderConfig {
  mode: ShaderMode;
  speed: ShaderSpeed;
  interactive: boolean;
  activeTypingThrottle: boolean;
  setMode: (mode: ShaderMode) => void;
  setSpeed: (speed: ShaderSpeed) => void;
  setInteractive: (interactive: boolean) => void;
  setActiveTypingThrottle: (throttle: boolean) => void;
}

const STORAGE_KEYS = {
  mode: 'typenova_shader_mode',
  speed: 'typenova_shader_speed',
  interactive: 'typenova_shader_interactive',
  activeTypingThrottle: 'typenova_shader_active_typing_throttle',
};

export const SHADER_MODES: { id: ShaderMode; name: string; desc: string; icon: string }[] = [
  {
    id: 'liquid',
    name: 'Cosmic Liquid',
    desc: 'Fluid caustic waves with organic ripples and smooth light refraction.',
    icon: 'waves',
  },
  {
    id: 'aurora',
    name: 'Aurora Borealis',
    desc: 'Undulating celestial light curtains drifting across the cosmic horizon.',
    icon: 'sparkles',
  },
  {
    id: 'grid',
    name: 'Cyber Warp Grid',
    desc: 'Retro-futuristic perspective grid with radiant horizon line pulses.',
    icon: 'grid',
  },
  {
    id: 'matrix',
    name: 'Matrix Stream',
    desc: 'Cascading columns of digital data streaks flowing downward.',
    icon: 'terminal',
  },
  {
    id: 'nebula',
    name: 'Deep Nebula',
    desc: 'Atmospheric volumetric stellar clouds and drifting cosmic dust.',
    icon: 'cloud',
  },
  {
    id: 'minimal',
    name: 'Minimal Void',
    desc: 'Pure clean dark background with zero shader animations for total focus.',
    icon: 'void',
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

  const [activeTypingThrottle, setActiveTypingThrottleState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.activeTypingThrottle);
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

  const setActiveTypingThrottle = useCallback((newThrottle: boolean) => {
    setActiveTypingThrottleState(newThrottle);
    localStorage.setItem(STORAGE_KEYS.activeTypingThrottle, String(newThrottle));
    notifyChange();
  }, [notifyChange]);

  useEffect(() => {
    const handleStorage = () => {
      const savedMode = (localStorage.getItem(STORAGE_KEYS.mode) as ShaderMode) || 'liquid';
      const savedSpeed = (localStorage.getItem(STORAGE_KEYS.speed) as ShaderSpeed) || 'normal';
      const savedInteractive = localStorage.getItem(STORAGE_KEYS.interactive) !== 'false';
      const savedThrottle = localStorage.getItem(STORAGE_KEYS.activeTypingThrottle) !== 'false';
      setModeState(savedMode);
      setSpeedState(savedSpeed);
      setInteractiveState(savedInteractive);
      setActiveTypingThrottleState(savedThrottle);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('shader_config_changed', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('shader_config_changed', handleStorage);
    };
  }, []);

  return useMemo(() => ({
    mode,
    speed,
    interactive,
    activeTypingThrottle,
    setMode,
    setSpeed,
    setInteractive,
    setActiveTypingThrottle,
  }), [
    mode,
    speed,
    interactive,
    activeTypingThrottle,
    setMode,
    setSpeed,
    setInteractive,
    setActiveTypingThrottle,
  ]);
}
