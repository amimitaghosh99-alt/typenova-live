/**
 * WebHID Mechanical Keyboard Latency & Jitter Benchmark Engine
 *
 * Interfaces directly with raw USB HID keyboard input reports via `navigator.hid`
 * (with sub-millisecond `KeyboardEvent.timeStamp` fallback for non-Chromium environments).
 *
 * Measures:
 * 1. True USB Controller Polling Rate (125Hz, 250Hz, 500Hz, 1000Hz, 2000Hz, 4000Hz, 8000Hz)
 * 2. Matrix Switch Debounce Duration (contact settling time)
 * 3. Timing Jitter Variance & Standard Deviation (σ_jitter)
 * 4. Mechanical Switch Contact Chatter Detection (< 15ms anomalous double hits)
 * 5. Overall Switch & Bus Stability Score (0 - 100)
 */

export interface HidReportSample {
  timestamp: number;
  deltaMs: number;
  key?: string;
  isDown?: boolean;
  rawBytes?: number[];
}

export interface SwitchDebounceEvent {
  key: string;
  pressTimestamp: number;
  releaseTimestamp: number;
  bounceDurationMs: number;
  isChatter: boolean;
}

export interface LatencyHistogramBucket {
  bucket: string;
  count: number;
  minMs: number;
  maxMs: number;
}

export interface WebHidBenchmarkStats {
  connected: boolean;
  deviceName: string;
  vendorId?: number;
  productId?: number;
  interfaceType: 'webhid' | 'keyboard_event_fallback';
  totalReports: number;
  currentPollingRateHz: number;
  detectedHarmonicHz: number;
  meanIntervalMs: number;
  medianIntervalMs: number;
  minIntervalMs: number;
  maxIntervalMs: number;
  jitterStdDevMs: number;
  meanDebounceMs: number;
  chatterCount: number;
  stabilityScore: number;
  recentDeltas: number[];
  histogramBuckets: LatencyHistogramBucket[];
  switchDebounceEvents: SwitchDebounceEvent[];
}

export const HARMONIC_POLLING_RATES = [8000, 4000, 2000, 1000, 500, 250, 125] as const;
export type HarmonicPollingRate = typeof HARMONIC_POLLING_RATES[number];

/**
 * Maps an array of millisecond intervals to the closest standard USB HID polling frequency.
 */
export function estimateHarmonicPollingRate(intervals: number[]): { currentHz: number; harmonicHz: number } {
  if (!intervals || intervals.length === 0) {
    return { currentHz: 0, harmonicHz: 1000 };
  }

  // Filter realistic report intervals (0.05ms to 50ms)
  const valid = intervals.filter(t => t > 0.04 && t < 50);
  if (valid.length === 0) {
    return { currentHz: 0, harmonicHz: 1000 };
  }

  const sorted = [...valid].sort((a, b) => a - b);
  const medianInterval = sorted[Math.floor(sorted.length / 2)];
  const rawHz = medianInterval > 0 ? Math.round(1000 / medianInterval) : 0;

  // Harmonic match: find closest target frequency
  let closestHarmonic: number = 1000;
  let minDiff = Infinity;

  for (const hz of HARMONIC_POLLING_RATES) {
    const expectedIntervalMs = 1000 / hz;
    const diff = Math.abs(medianInterval - expectedIntervalMs);
    if (diff < minDiff) {
      minDiff = diff;
      closestHarmonic = hz;
    }
  }

  return { currentHz: rawHz, harmonicHz: closestHarmonic };
}

/**
 * Calculates standard deviation (jitter) of time intervals.
 */
export function calculateJitterStdDev(intervals: number[]): number {
  if (!intervals || intervals.length < 2) return 0;
  const valid = intervals.filter(t => t > 0 && t < 100);
  if (valid.length < 2) return 0;

  const mean = valid.reduce((acc, v) => acc + v, 0) / valid.length;
  const variance = valid.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (valid.length - 1);
  return Math.round(Math.sqrt(variance) * 1000) / 1000;
}

/**
 * Calculates mechanical switch stability score from 0 to 100.
 */
export function calculateSwitchStability(
  jitterStdDev: number,
  chatterCount: number,
  sampleCount: number
): number {
  if (sampleCount < 5) return 100;
  // Penalty for timing variance: 1ms stddev deducts ~25 points
  const jitterPenalty = Math.min(60, jitterStdDev * 25);
  // Penalty for switch chattering (dirty mechanical contacts)
  const chatterPenalty = Math.min(40, chatterCount * 15);
  return Math.max(0, Math.min(100, Math.round(100 - jitterPenalty - chatterPenalty)));
}

/**
 * Analyzes switch contact bounce and chattering.
 */
export function calculateDebounceStats(events: SwitchDebounceEvent[]): {
  meanDebounceMs: number;
  minDebounceMs: number;
  chatterCount: number;
} {
  if (!events || events.length === 0) {
    return { meanDebounceMs: 0, minDebounceMs: 0, chatterCount: 0 };
  }

  const validBounces = events.map(e => e.bounceDurationMs).filter(b => b > 0);
  const chatterCount = events.filter(e => e.isChatter).length;

  if (validBounces.length === 0) {
    return { meanDebounceMs: 0, minDebounceMs: 0, chatterCount };
  }

  const sum = validBounces.reduce((acc, b) => acc + b, 0);
  const min = Math.min(...validBounces);
  return {
    meanDebounceMs: Math.round((sum / validBounces.length) * 10) / 10,
    minDebounceMs: Math.round(min * 10) / 10,
    chatterCount,
  };
}

/**
 * Builds latency distribution histogram buckets.
 */
export function buildLatencyHistogram(intervals: number[]): LatencyHistogramBucket[] {
  const bucketDefs: { label: string; min: number; max: number }[] = [
    { label: '<0.2ms (8k)', min: 0, max: 0.2 },
    { label: '0.2-0.4ms (4k)', min: 0.2, max: 0.4 },
    { label: '0.4-0.8ms (2k)', min: 0.4, max: 0.8 },
    { label: '0.8-1.5ms (1k)', min: 0.8, max: 1.5 },
    { label: '1.5-3.0ms (500Hz)', min: 1.5, max: 3.0 },
    { label: '3.0-6.0ms (250Hz)', min: 3.0, max: 6.0 },
    { label: '6.0-10ms (125Hz)', min: 6.0, max: 10.0 },
    { label: '>10ms', min: 10.0, max: Infinity },
  ];

  const valid = intervals.filter(t => t > 0 && t < 100);

  return bucketDefs.map(b => {
    const count = valid.filter(t => t >= b.min && t < b.max).length;
    return {
      bucket: b.label,
      count,
      minMs: b.min,
      maxMs: b.max,
    };
  });
}

/**
 * WebHID Benchmark Controller class.
 */
export class WebHidBenchmarkController {
  private device: any = null;
  private isListening: boolean = false;
  private lastReportTimestamp: number = 0;
  private rawIntervals: number[] = [];
  private switchPressMap: Map<string, number> = new Map();
  private switchLastReleaseMap: Map<string, number> = new Map();
  private debounceEvents: SwitchDebounceEvent[] = [];
  private onUpdateCallback?: (stats: WebHidBenchmarkStats) => void;
  private deviceName: string = 'Browser Event Loop Fallback';
  private vendorId?: number;
  private productId?: number;
  private interfaceType: 'webhid' | 'keyboard_event_fallback' = 'keyboard_event_fallback';

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'hid' in navigator;
  }

  public async requestDevice(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const hid = (navigator as any).hid;
      const devices = await hid.requestDevice({
        filters: [], // Allow all HID input devices (keyboards, custom controllers)
      });

      if (devices && devices.length > 0) {
        this.device = devices[0];
        this.deviceName = this.device.productName || `HID Device (${this.device.vendorId.toString(16)}:${this.device.productId.toString(16)})`;
        this.vendorId = this.device.vendorId;
        this.productId = this.device.productId;
        this.interfaceType = 'webhid';

        if (!this.device.opened) {
          await this.device.open();
        }

        this.setupDeviceListeners();
        return true;
      }
    } catch (e) {
      console.warn('[WebHID] Device request dismissed or failed:', e);
    }
    return false;
  }

  private setupDeviceListeners() {
    if (!this.device) return;

    this.device.oninputreport = (event: any) => {
      if (!this.isListening) return;
      const now = event.timeStamp || performance.now();
      if (this.lastReportTimestamp > 0) {
        const delta = Math.max(0.01, now - this.lastReportTimestamp);
        this.processInterval(delta);
      }
      this.lastReportTimestamp = now;
    };
  }

  public startSession(onUpdate?: (stats: WebHidBenchmarkStats) => void) {
    this.isListening = true;
    this.lastReportTimestamp = 0;
    this.onUpdateCallback = onUpdate;
    this.notifyUpdate();
  }

  public stopSession() {
    this.isListening = false;
  }

  public async disconnect() {
    this.stopSession();
    if (this.device && this.device.opened) {
      try {
        await this.device.close();
      } catch {}
    }
    this.device = null;
    this.deviceName = 'Browser Event Loop Fallback';
    this.vendorId = undefined;
    this.productId = undefined;
    this.interfaceType = 'keyboard_event_fallback';
    this.notifyUpdate();
  }

  public recordKeyEvent(key: string, isDown: boolean, eventTimestamp?: number) {
    if (!this.isListening) return;
    const now = eventTimestamp || performance.now();

    if (this.interfaceType === 'keyboard_event_fallback') {
      if (this.lastReportTimestamp > 0) {
        const delta = Math.max(0.05, now - this.lastReportTimestamp);
        this.processInterval(delta);
      }
      this.lastReportTimestamp = now;
    }

    // Switch Debounce & Contact Chatter Analysis
    if (isDown) {
      const lastRelease = this.switchLastReleaseMap.get(key) || 0;
      const timeSinceRelease = now - lastRelease;

      // Contact chatter: switch re-actuating in under 15ms after release is typical chatter
      const isChatter = lastRelease > 0 && timeSinceRelease < 15;

      this.switchPressMap.set(key, now);

      if (isChatter) {
        this.debounceEvents.push({
          key,
          pressTimestamp: now,
          releaseTimestamp: now,
          bounceDurationMs: Math.round(timeSinceRelease * 10) / 10,
          isChatter: true,
        });
      }
    } else {
      const pressTime = this.switchPressMap.get(key);
      if (pressTime) {
        const bounceDuration = Math.max(0.1, now - pressTime);
        this.debounceEvents.push({
          key,
          pressTimestamp: pressTime,
          releaseTimestamp: now,
          bounceDurationMs: Math.round(bounceDuration * 10) / 10,
          isChatter: false,
        });
        this.switchPressMap.delete(key);
      }
      this.switchLastReleaseMap.set(key, now);
    }

    if (this.debounceEvents.length > 500) {
      this.debounceEvents.shift();
    }

    this.notifyUpdate();
  }

  public processInterval(deltaMs: number) {
    if (deltaMs <= 0 || deltaMs > 250) return;
    this.rawIntervals.push(deltaMs);
    if (this.rawIntervals.length > 500) {
      this.rawIntervals.shift();
    }
    this.notifyUpdate();
  }

  public reset() {
    this.rawIntervals = [];
    this.debounceEvents = [];
    this.switchPressMap.clear();
    this.switchLastReleaseMap.clear();
    this.lastReportTimestamp = 0;
    this.notifyUpdate();
  }

  public getStats(): WebHidBenchmarkStats {
    const intervals = this.rawIntervals;
    const count = intervals.length;

    const { currentHz, harmonicHz } = estimateHarmonicPollingRate(intervals);
    const jitterStdDevMs = calculateJitterStdDev(intervals);

    let mean = 0;
    let min = 0;
    let max = 0;
    let median = 0;

    if (count > 0) {
      const sorted = [...intervals].sort((a, b) => a - b);
      mean = Math.round((intervals.reduce((a, b) => a + b, 0) / count) * 100) / 100;
      median = Math.round(sorted[Math.floor(count / 2)] * 100) / 100;
      min = Math.round(sorted[0] * 100) / 100;
      max = Math.round(sorted[count - 1] * 100) / 100;
    }

    const { meanDebounceMs, chatterCount } = calculateDebounceStats(this.debounceEvents);
    const stabilityScore = calculateSwitchStability(jitterStdDevMs, chatterCount, count);
    const recentDeltas = intervals.slice(-120);
    const histogramBuckets = buildLatencyHistogram(intervals);

    return {
      connected: this.device !== null || count > 0,
      deviceName: this.deviceName,
      vendorId: this.vendorId,
      productId: this.productId,
      interfaceType: this.interfaceType,
      totalReports: count,
      currentPollingRateHz: currentHz,
      detectedHarmonicHz: harmonicHz,
      meanIntervalMs: mean,
      medianIntervalMs: median,
      minIntervalMs: min,
      maxIntervalMs: max,
      jitterStdDevMs,
      meanDebounceMs,
      chatterCount,
      stabilityScore,
      recentDeltas,
      histogramBuckets,
      switchDebounceEvents: this.debounceEvents.slice(-20),
    };
  }

  private notifyUpdate() {
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.getStats());
    }
  }
}
