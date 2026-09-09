/**
 * Audio Dictation Engine: Manages Speech Synthesis, word boundary telemetry,
 * and Web Audio visualization feeds for Audio Transcription Shadowing.
 */

export interface SpokenWordBoundary {
  word: string;
  charIndex: number;
  charLength: number;
  spokenTimestamp: number; // millisecond timestamp relative to start
}

export interface AudioDictationState {
  isPlaying: boolean;
  activeWordIndex: number;
  spokenBoundaries: SpokenWordBoundary[];
  speedMultiplier: number;
}

let synthAudioCtx: AudioContext | null = null;
let synthAnalyser: AnalyserNode | null = null;
let synthGain: GainNode | null = null;
let animOsc: OscillatorNode | null = null;

function getSynthAudioCtx(): { ctx: AudioContext; analyser: AnalyserNode; gain: GainNode } | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;

  if (!synthAudioCtx) {
    synthAudioCtx = new AC();
    synthAnalyser = synthAudioCtx.createAnalyser();
    synthAnalyser.fftSize = 64;
    synthAnalyser.smoothingTimeConstant = 0.8;
    synthGain = synthAudioCtx.createGain();
    synthGain.gain.setValueAtTime(0.001, synthAudioCtx.currentTime); // silent oscillator for visualizer feedback
    synthGain.connect(synthAnalyser);
    synthAnalyser.connect(synthAudioCtx.destination);
  }

  if (synthAudioCtx.state === 'suspended') {
    synthAudioCtx.resume().catch(() => {});
  }

  return synthAnalyser && synthGain ? { ctx: synthAudioCtx, analyser: synthAnalyser, gain: synthGain } : null;
}

export function getAudioAnalyser(): AnalyserNode | null {
  const nodes = getSynthAudioCtx();
  return nodes ? nodes.analyser : null;
}

/**
 * Procedurally generates expected word boundary timestamps for a piece of text given a playback speed.
 * Typical speaking rate is ~140 WPM at 1.0x (approx 430ms per word).
 */
export function generateSimulatedBoundaries(
  text: string,
  speedMultiplier: number = 1.0,
  startOffsetMs: number = 0
): SpokenWordBoundary[] {
  if (!text) return [];
  const words = text.split(/\s+/).filter(Boolean);
  const boundaries: SpokenWordBoundary[] = [];

  const baseMsPerWord = 430 / Math.max(0.5, Math.min(2.5, speedMultiplier));
  let cumulativeTime = startOffsetMs;
  let charCursor = 0;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const actualCharIndex = text.indexOf(w, charCursor);
    const indexToUse = actualCharIndex >= 0 ? actualCharIndex : charCursor;
    charCursor = indexToUse + w.length;

    // Longer words take proportionally slightly more acoustic time
    const wordDuration = Math.round(baseMsPerWord * Math.max(0.7, w.length / 5));

    boundaries.push({
      word: w,
      charIndex: indexToUse,
      charLength: w.length,
      spokenTimestamp: Math.round(cumulativeTime),
    });

    cumulativeTime += wordDuration;
  }

  return boundaries;
}

export class AudioDictationController {
  private startTime: number = 0;
  private boundaries: SpokenWordBoundary[] = [];
  private onBoundaryCallback?: (boundary: SpokenWordBoundary, wordIndex: number) => void;
  private onEndCallback?: () => void;
  private isRunning: boolean = false;
  private speed: number = 1.0;

  private fallbackTimerIds: ReturnType<typeof setTimeout>[] = [];

  constructor(speed: number = 1.0) {
    this.speed = speed;
  }

  public setSpeed(speed: number) {
    this.speed = Math.max(0.5, Math.min(2.0, speed));
  }

  public getBoundaries(fallbackText?: string): SpokenWordBoundary[] {
    if (this.boundaries.length > 0) {
      return [...this.boundaries];
    }
    if (fallbackText) {
      return generateSimulatedBoundaries(fallbackText, this.speed);
    }
    return [];
  }

  public start(
    text: string,
    onBoundary?: (boundary: SpokenWordBoundary, wordIndex: number) => void,
    onEnd?: () => void
  ) {
    this.stop();
    this.boundaries = [];
    this.onBoundaryCallback = onBoundary;
    this.onEndCallback = onEnd;
    this.isRunning = true;
    this.startTime = performance.now();

    // Start silent carrier tone in Web Audio to animate waveform
    const audio = getSynthAudioCtx();
    if (audio) {
      try {
        animOsc = audio.ctx.createOscillator();
        animOsc.type = 'sine';
        animOsc.frequency.setValueAtTime(140, audio.ctx.currentTime);
        animOsc.connect(audio.gain);
        audio.gain.gain.setValueAtTime(0.04, audio.ctx.currentTime);
        animOsc.start();
      } catch {}
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.speed;
      utterance.pitch = 1.0;

      // Select natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(
        v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Enhanced'))
      ) || voices.find(v => v.lang.startsWith('en'));

      if (naturalVoice) utterance.voice = naturalVoice;

      let wordCount = 0;

      utterance.onboundary = (event) => {
        if (!this.isRunning) return;
        if (event.name === 'word') {
          const elapsed = Math.round(performance.now() - this.startTime);
          const charIndex = event.charIndex;
          const remaining = text.slice(charIndex);
          const match = remaining.match(/^(\S+)/);
          const word = match ? match[1] : '';

          const boundary: SpokenWordBoundary = {
            word,
            charIndex,
            charLength: word.length,
            spokenTimestamp: elapsed,
          };

          this.boundaries.push(boundary);
          if (this.onBoundaryCallback) {
            this.onBoundaryCallback(boundary, wordCount);
          }
          wordCount++;
        }
      };

      utterance.onend = () => {
        this.stop();
        if (this.onEndCallback) this.onEndCallback();
      };

      utterance.onerror = () => {
        this.fallbackSimulatedPlayback(text);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      this.fallbackSimulatedPlayback(text);
    }
  }

  private fallbackSimulatedPlayback(text: string) {
    const simulated = generateSimulatedBoundaries(text, this.speed);
    this.boundaries = simulated;

    simulated.forEach((b, idx) => {
      const tid = setTimeout(() => {
        if (!this.isRunning) return;
        if (this.onBoundaryCallback) {
          this.onBoundaryCallback(b, idx);
        }
      }, b.spokenTimestamp);
      this.fallbackTimerIds.push(tid);
    });

    const totalDuration = simulated[simulated.length - 1]?.spokenTimestamp || 5000;
    const endTid = setTimeout(() => {
      if (!this.isRunning) return;
      this.stop();
      if (this.onEndCallback) this.onEndCallback();
    }, totalDuration + 500);
    this.fallbackTimerIds.push(endTid);
  }

  public stop() {
    this.isRunning = false;
    this.fallbackTimerIds.forEach(tid => clearTimeout(tid));
    this.fallbackTimerIds = [];

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (animOsc) {
      try {
        animOsc.stop();
        animOsc.disconnect();
      } catch {}
      animOsc = null;
    }
  }
}
