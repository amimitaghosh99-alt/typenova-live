/**
 * Procedural audio engine for TypeNova.
 * All sounds use pure sine waves at low volumes, heavily filtered
 * to feel warm and subtle — never harsh or jarring.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private isInitialized = false;

  init() {
    if (this.isInitialized) return;
    
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AC();

    // Master volume bus so everything is controllable
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.6;
    this.masterGain.connect(this.ctx.destination);

    this.isInitialized = true;
    this.startAmbient();
  }

  private startAmbient() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    // Sub-bass drone — so low you feel it more than hear it
    this.ambientOsc = this.ctx.createOscillator();
    this.ambientOsc.type = 'sine';
    this.ambientOsc.frequency.setValueAtTime(40, t);

    // Gentle LFO for breathing effect
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.08, t);

    const lfoDepth = this.ctx.createGain();
    lfoDepth.gain.setValueAtTime(0.005, t);

    lfo.connect(lfoDepth);

    const ambientGain = this.ctx.createGain();
    ambientGain.gain.setValueAtTime(0.02, t);
    lfoDepth.connect(ambientGain.gain);

    // Heavy low-pass to remove any overtones
    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 80;
    lpf.Q.value = 1;

    this.ambientOsc.connect(lpf);
    lpf.connect(ambientGain);
    ambientGain.connect(this.masterGain);

    this.ambientOsc.start();
    lfo.start();
  }

  playHover() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    // Soft, brief glass-tap: a filtered sine blip
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.015);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.008, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 3000;

    osc.connect(lpf);
    lpf.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  playClick() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    // Warm low-mid thump
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 200;

    osc.connect(lpf);
    lpf.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  playStartup() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    // Slow rising sweep with filter opening — like a system boot
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(30, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 2.0);
    osc.frequency.exponentialRampToValueAtTime(80, t + 3.5);

    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(60, t);
    lpf.frequency.exponentialRampToValueAtTime(500, t + 2.0);
    lpf.frequency.exponentialRampToValueAtTime(200, t + 3.5);
    lpf.Q.value = 2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.04, t + 1.2);
    gain.gain.linearRampToValueAtTime(0.02, t + 2.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);

    osc.connect(lpf);
    lpf.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 4.0);
  }
}

export const audioEngine = new AudioEngine();
