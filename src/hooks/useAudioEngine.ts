import { useCallback, useRef } from 'react';

let globalAudioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!globalAudioCtx) globalAudioCtx = new AC();
  if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
  return globalAudioCtx;
};

export type SoundType = 'key' | 'error' | 'levelup' | 'achievement' | 'click';

export const useAudioEngine = () => {
  const mutedRef = useRef(false);
  const soundProfileRef = useRef('thocky');
  const comboRef = useRef(0);

  const setMuted = useCallback((val: boolean) => { mutedRef.current = val; }, []);
  const setSoundProfile = useCallback((val: string) => { soundProfileRef.current = val; }, []);
  const setComboRef = useCallback((val: number) => { comboRef.current = val; }, []);

  const playSound = useCallback((type: SoundType) => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const comboFactor = Math.min(1, comboRef.current / 60);

    const createOneShot = ({ oscType = 'sine', freq = 200, duration = 0.06, gainVal = 0.2, detune = 0 }: {
      oscType?: OscillatorType; freq?: number; duration?: number; gainVal?: number; detune?: number;
    }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = oscType;
      osc.frequency.setValueAtTime(freq * (1 + comboFactor * 0.45), now);
      osc.detune.value = detune;
      gain.gain.setValueAtTime(gainVal + comboFactor * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    };

    if (type === 'error') {
      createOneShot({ oscType: 'sawtooth', freq: 120, duration: 0.12, gainVal: 0.35 });
      return;
    }
    if (type === 'levelup') {
      createOneShot({ oscType: 'square', freq: 440, duration: 0.1, gainVal: 0.3 });
      setTimeout(() => createOneShot({ oscType: 'square', freq: 554, duration: 0.1, gainVal: 0.3 }), 100);
      setTimeout(() => createOneShot({ oscType: 'square', freq: 659, duration: 0.3, gainVal: 0.3 }), 200);
      return;
    }
    if (type === 'achievement') {
      createOneShot({ oscType: 'sine', freq: 523.25, duration: 0.1, gainVal: 0.4 });
      setTimeout(() => createOneShot({ oscType: 'sine', freq: 659.25, duration: 0.1, gainVal: 0.4 }), 100);
      setTimeout(() => createOneShot({ oscType: 'sine', freq: 783.99, duration: 0.4, gainVal: 0.4 }), 200);
      return;
    }

    const profile = soundProfileRef.current;
    switch (profile) {
      case 'alpaca': createOneShot({ oscType: 'triangle', freq: 140 + comboFactor * 120, duration: 0.08, gainVal: 0.18 }); break;
      case 'modelm':
        createOneShot({ oscType: 'square', freq: 220 + comboFactor * 180, duration: 0.06, gainVal: 0.18, detune: comboFactor * 60 });
        setTimeout(() => createOneShot({ oscType: 'triangle', freq: 440 + comboFactor * 360, duration: 0.06, gainVal: 0.06 }), 12);
        break;
      case 'raindrops': createOneShot({ oscType: 'sine', freq: 600 + comboFactor * 400 + (Math.random() * 400 - 200), duration: 0.05, gainVal: 0.06 + comboFactor * 0.12 }); break;
      case 'arcade': createOneShot({ oscType: 'square', freq: 320 + comboFactor * 240, duration: 0.04, gainVal: 0.14 }); break;
      case 'clicky': createOneShot({ oscType: 'square', freq: 260 + comboFactor * 180, duration: 0.045, gainVal: 0.12 }); break;
      case 'linear': createOneShot({ oscType: 'triangle', freq: 200 + comboFactor * 120, duration: 0.05, gainVal: 0.12 }); break;
      default: createOneShot({ oscType: 'sine', freq: 180 + comboFactor * 140, duration: 0.05, gainVal: 0.18 }); break;
    }
  }, []); // No deps — reads everything from refs

  return { playSound, setMuted, setSoundProfile, setComboRef, mutedRef, soundProfileRef };
};
