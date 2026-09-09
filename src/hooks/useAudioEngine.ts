import { useCallback, useRef, useMemo } from 'react';

let globalAudioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!globalAudioCtx) globalAudioCtx = new AC();
  if (globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume().catch(() => {});
  }
  return globalAudioCtx;
};

export type SoundType =
  | 'key'
  | 'error'
  | 'levelup'
  | 'achievement'
  | 'click'
  | 'combo_milestone'
  | 'hex_cast'
  | 'hex_hit'
  | 'shield_deflect'
  | 'cleanse';

export const useAudioEngine = () => {
  const mutedRef = useRef(false);
  const soundProfileRef = useRef('thocky');
  const comboRef = useRef(0);

  const setMuted = useCallback((val: boolean) => { mutedRef.current = val; }, []);
  const setSoundProfile = useCallback((val: string) => { soundProfileRef.current = val; }, []);
  const setComboRef = useCallback((val: number) => { comboRef.current = val; }, []);

  const playSound = useCallback((type: SoundType, milestoneTier?: number) => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const comboFactor = Math.min(1, comboRef.current / 60);

    const createOneShot = ({
      oscType = 'sine',
      freq = 200,
      duration = 0.06,
      gainVal = 0.2,
      detune = 0,
      startTime = 0,
      ignoreComboFactor = false,
    }: {
      oscType?: OscillatorType;
      freq?: number;
      duration?: number;
      gainVal?: number;
      detune?: number;
      startTime?: number;
      ignoreComboFactor?: boolean;
    }) => {
      const startT = now + startTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = oscType;
      const effectiveFreq = ignoreComboFactor ? freq : freq * (1 + comboFactor * 0.45);
      const effectiveGain = ignoreComboFactor ? gainVal : gainVal + comboFactor * 0.25;
      osc.frequency.setValueAtTime(effectiveFreq, startT);
      osc.detune.value = detune;
      gain.gain.setValueAtTime(effectiveGain, startT);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
      osc.start(startT);
      osc.stop(startT + duration);
    };

    if (type === 'error') {
      createOneShot({ oscType: 'sawtooth', freq: 120, duration: 0.12, gainVal: 0.35 });
      return;
    }
    if (type === 'levelup') {
      createOneShot({ oscType: 'square', freq: 440, duration: 0.1, gainVal: 0.3, ignoreComboFactor: true });
      createOneShot({ oscType: 'square', freq: 554, duration: 0.1, gainVal: 0.3, startTime: 0.1, ignoreComboFactor: true });
      createOneShot({ oscType: 'square', freq: 659, duration: 0.3, gainVal: 0.3, startTime: 0.2, ignoreComboFactor: true });
      return;
    }
    if (type === 'achievement') {
      createOneShot({ oscType: 'sine', freq: 523.25, duration: 0.1, gainVal: 0.4, ignoreComboFactor: true });
      createOneShot({ oscType: 'sine', freq: 659.25, duration: 0.1, gainVal: 0.4, startTime: 0.1, ignoreComboFactor: true });
      createOneShot({ oscType: 'sine', freq: 783.99, duration: 0.4, gainVal: 0.4, startTime: 0.2, ignoreComboFactor: true });
      return;
    }
    if (type === 'combo_milestone') {
      const tier = milestoneTier ?? comboRef.current;
      let notes: number[];
      if (tier >= 200) {
        // Tier 4 (200+): Ascending pentatonic flourish (A5, C#6, E6, A6)
        notes = [880.00, 1108.73, 1318.51, 1760.00];
      } else if (tier >= 150) {
        // Tier 3 (150): G major chord arpeggio (G5, B5, D6, G6)
        notes = [783.99, 987.77, 1174.66, 1567.98];
      } else if (tier >= 100) {
        // Tier 2 (100): E major chord arpeggio (E5, G#5, B5, E6)
        notes = [659.25, 830.61, 987.77, 1318.51];
      } else {
        // Tier 1 (50): C major chord arpeggio (C5, E5, G5)
        notes = [523.25, 659.25, 783.99];
      }

      notes.forEach((freq, idx) => {
        const offset = idx * 0.045;
        // Primary harmonic sine tone with gentle 0.2s exponential gain decay
        createOneShot({
          oscType: 'sine',
          freq,
          duration: 0.2,
          gainVal: 0.18,
          startTime: offset,
          ignoreComboFactor: true,
        });
        // Soft harmonic triangle overtone for chime richness
        createOneShot({
          oscType: 'triangle',
          freq: freq * 1.5,
          duration: 0.18,
          gainVal: 0.05,
          startTime: offset + 0.008,
          ignoreComboFactor: true,
        });
      });
      return;
    }

    if (type === 'hex_cast') {
      // Rapid ascending cyber attack sweep
      createOneShot({ oscType: 'sawtooth', freq: 320, duration: 0.08, gainVal: 0.22, ignoreComboFactor: true });
      createOneShot({ oscType: 'sine', freq: 640, duration: 0.12, gainVal: 0.25, startTime: 0.05, ignoreComboFactor: true });
      createOneShot({ oscType: 'triangle', freq: 960, duration: 0.18, gainVal: 0.20, startTime: 0.10, ignoreComboFactor: true });
      return;
    }

    if (type === 'hex_hit') {
      // Low glitch distortion impact
      createOneShot({ oscType: 'sawtooth', freq: 95, duration: 0.16, gainVal: 0.35, detune: -40, ignoreComboFactor: true });
      createOneShot({ oscType: 'square', freq: 160, duration: 0.10, gainVal: 0.25, startTime: 0.04, ignoreComboFactor: true });
      return;
    }

    if (type === 'shield_deflect') {
      // High-pitched crystal barrier deflect ping
      createOneShot({ oscType: 'sine', freq: 1174.66, duration: 0.18, gainVal: 0.25, ignoreComboFactor: true });
      createOneShot({ oscType: 'sine', freq: 1760.00, duration: 0.25, gainVal: 0.22, startTime: 0.03, ignoreComboFactor: true });
      createOneShot({ oscType: 'triangle', freq: 2349.32, duration: 0.30, gainVal: 0.15, startTime: 0.06, ignoreComboFactor: true });
      return;
    }

    if (type === 'cleanse') {
      // Purifying harmonic resolution
      createOneShot({ oscType: 'sine', freq: 587.33, duration: 0.15, gainVal: 0.22, ignoreComboFactor: true });
      createOneShot({ oscType: 'sine', freq: 880.00, duration: 0.20, gainVal: 0.25, startTime: 0.06, ignoreComboFactor: true });
      createOneShot({ oscType: 'sine', freq: 1318.51, duration: 0.35, gainVal: 0.20, startTime: 0.12, ignoreComboFactor: true });
      return;
    }

    const profile = soundProfileRef.current;
    switch (profile) {
      case 'alpaca': createOneShot({ oscType: 'triangle', freq: 140 + comboFactor * 120, duration: 0.08, gainVal: 0.18 }); break;
      case 'modelm':
        createOneShot({ oscType: 'square', freq: 220 + comboFactor * 180, duration: 0.06, gainVal: 0.18, detune: comboFactor * 60 });
        createOneShot({ oscType: 'triangle', freq: 440 + comboFactor * 360, duration: 0.06, gainVal: 0.06, startTime: 0.012 });
        break;
      case 'raindrops': createOneShot({ oscType: 'sine', freq: 600 + comboFactor * 400 + (Math.random() * 400 - 200), duration: 0.05, gainVal: 0.06 + comboFactor * 0.12 }); break;
      case 'arcade': createOneShot({ oscType: 'square', freq: 320 + comboFactor * 240, duration: 0.04, gainVal: 0.14 }); break;
      case 'clicky': createOneShot({ oscType: 'square', freq: 260 + comboFactor * 180, duration: 0.045, gainVal: 0.12 }); break;
      case 'linear': createOneShot({ oscType: 'triangle', freq: 200 + comboFactor * 120, duration: 0.05, gainVal: 0.12 }); break;
      default: createOneShot({ oscType: 'sine', freq: 180 + comboFactor * 140, duration: 0.05, gainVal: 0.18 }); break;
    }
  }, []); // No deps — reads everything from refs

  return useMemo(() => ({
    playSound,
    setMuted,
    setSoundProfile,
    setComboRef,
    mutedRef,
    soundProfileRef
  }), [playSound, setMuted, setSoundProfile, setComboRef]);
};
