// ═══════════════════════════════════════════════════════════════════════
//  MECHANICAL AUDIO — procedural Web Audio switch clack synthesiser
//  ---------------------------------------------------------------------
//  Generates a realistic mechanical keyboard switch sound on demand using
//  two oscillators (noise burst + pitched click) and an amplitude envelope.
//
//  Zero audio assets. Lazy AudioContext creation (suspended until first
//  user gesture). Safe to call on any platform — silently no-ops if Web
//  Audio is unavailable.
// ═══════════════════════════════════════════════════════════════════════

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
  } catch {
    return null;
  }
  return ctx;
}

export type SwitchProfile = 'clack' | 'thock' | 'creamy';

/**
 * Play a single mechanical switch clack.
 * `volume` ∈ [0, 1]. Call is fire-and-forget — no return value.
 */
export function playMechClick(volume = 0.35, profile: SwitchProfile = 'thock'): void {
  const ac = getCtx();
  if (!ac) return;

  // Resume if suspended (happens before first user gesture on some browsers)
  if (ac.state === 'suspended') {
    ac.resume().catch(() => {});
  }

  const now = ac.currentTime;

  // Profile-specific audio synthesis parameters
  const params = {
    clack: { bpFreq: 3800, bpQ: 1.4, oscStart: 5400, oscEnd: 1400, noiseDur: 0.022, clickDur: 0.010, noiseGain: 0.85 },
    thock: { bpFreq: 2400, bpQ: 1.0, oscStart: 3600, oscEnd: 850, noiseDur: 0.030, clickDur: 0.015, noiseGain: 0.75 },
    creamy: { bpFreq: 1850, bpQ: 0.8, oscStart: 2600, oscEnd: 600, noiseDur: 0.028, clickDur: 0.014, noiseGain: 0.65 },
  }[profile];

  // ── Master gain ──
  const master = ac.createGain();
  master.gain.setValueAtTime(volume, now);
  master.connect(ac.destination);

  // ── 1. Noise burst (the body of the keycap bottom-out) ──
  const noiseDur = params.noiseDur;
  const noiseLen = Math.ceil(ac.sampleRate * noiseDur);
  const noiseBuf = ac.createBuffer(1, noiseLen, ac.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseLen * 0.28));
  }
  const noiseSrc = ac.createBufferSource();
  noiseSrc.buffer = noiseBuf;

  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(params.bpFreq, now);
  bp.Q.setValueAtTime(params.bpQ, now);

  const noiseGain = ac.createGain();
  noiseGain.gain.setValueAtTime(params.noiseGain, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDur);

  noiseSrc.connect(bp).connect(noiseGain).connect(master);
  noiseSrc.start(now);
  noiseSrc.stop(now + noiseDur);

  // ── 2. Pitched click (the stem / slider contact) ──
  const clickDur = params.clickDur;
  const osc = ac.createOscillator();
  osc.type = profile === 'thock' ? 'triangle' : 'sine';
  osc.frequency.setValueAtTime(params.oscStart, now);
  osc.frequency.exponentialRampToValueAtTime(params.oscEnd, now + clickDur);

  const clickGain = ac.createGain();
  clickGain.gain.setValueAtTime(profile === 'clack' ? 0.6 : 0.45, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + clickDur);

  osc.connect(clickGain).connect(master);
  osc.start(now);
  osc.stop(now + clickDur);

  setTimeout(() => {
    try {
      noiseSrc.disconnect();
      bp.disconnect();
      noiseGain.disconnect();
      osc.disconnect();
      clickGain.disconnect();
      master.disconnect();
    } catch { /* already disconnected */ }
  }, 100);
}
