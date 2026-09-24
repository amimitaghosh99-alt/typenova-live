/**
 * TypeNova Synthetic Client Health Diagnostics & Health Signal Bus
 * 
 * Provides proactive client-side failure detection (auth expiration, WebSocket
 * room disconnects, BYOK LLM rate limits, audio autoplay blocks, and storage
 * quotas) rather than blindly relying on edge CDN HTTP 200 responses.
 */

import { supabase } from './supabase';
import { getStoredAIKey, AI_KEYS, DEFAULT_BASE_URL } from './aiClient';


export type SubsystemStatus = 'pass' | 'warn' | 'fail';

export interface SubsystemCheck {
  status: SubsystemStatus;
  detail: string;
  latencyMs?: number;
  [key: string]: unknown;
}

export interface SystemHealthReport {
  overall: 'healthy' | 'degraded' | 'critical';
  timestamp: number;
  environment: 'production' | 'development' | 'test';
  checks: {
    storage: SubsystemCheck;
    audio: SubsystemCheck;
    auth: SubsystemCheck;
    network: SubsystemCheck;
    ai: SubsystemCheck;
  };
  warnings: string[];
}

export type HealthSignalType =
  | 'auth_expired'
  | 'auth_error'
  | 'race_disconnected'
  | 'race_timeout'
  | 'ai_rate_limit'
  | 'ai_auth_error'
  | 'ai_network_error'
  | 'audio_blocked'
  | 'storage_quota_exceeded';

export interface HealthSignal {
  id: string;
  type: HealthSignalType;
  severity: 'info' | 'warning' | 'error';
  subsystem: 'auth' | 'race' | 'ai' | 'audio' | 'storage';
  message: string;
  timestamp: number;
  recoveryLabel?: string;
  recoveryAction?: () => void;
}

const RECENT_SIGNALS_LIMIT = 20;
const recentSignals: HealthSignal[] = [];
const inMemorySubscribers = new Set<(signal: HealthSignal) => void>();

/**
 * Dispatches a high-priority health signal across the application.
 */
export function emitHealthSignal(
  signal: Omit<HealthSignal, 'id' | 'timestamp'> & Partial<Pick<HealthSignal, 'id' | 'timestamp'>>,
): HealthSignal {
  const fullSignal: HealthSignal = {
    id: signal.id || `sig-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: signal.timestamp || Date.now(),
    ...signal,
  };

  // Debounce identical consecutive signals within 1000ms to avoid signal storms
  const lastSignal = recentSignals[0];
  if (
    lastSignal &&
    lastSignal.type === fullSignal.type &&
    lastSignal.message === fullSignal.message &&
    fullSignal.timestamp - lastSignal.timestamp < 1000
  ) {
    return lastSignal;
  }

  recentSignals.unshift(fullSignal);
  if (recentSignals.length > RECENT_SIGNALS_LIMIT) {
    recentSignals.pop();
  }

  // Notify direct in-memory subscribers safely
  inMemorySubscribers.forEach((sub) => {
    try {
      sub(fullSignal);
    } catch (err) {
      console.error('[HealthMonitor] Subscriber threw an error:', err);
    }
  });

  // Also dispatch DOM CustomEvent if in browser window
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent<HealthSignal & { _tn_in_mem?: boolean }>('typenova_health_signal', {
          detail: { ...fullSignal, _tn_in_mem: true },
        }),
      );
    } catch (err) {
      console.warn('[HealthMonitor] Signal dispatch error:', err);
    }
  }

  return fullSignal;
}

// Global window event listener bridge for external or cross-context signals
if (typeof window !== 'undefined') {
  window.addEventListener('typenova_health_signal', (e: Event) => {
    try {
      const ce = e as CustomEvent<HealthSignal & { _tn_in_mem?: boolean }>;
      if (ce.detail && !ce.detail._tn_in_mem) {
        emitHealthSignal(ce.detail);
      }
    } catch { /* ignore */ }
  });
}

/**
 * Subscribes to real-time health signals. Returns an unsubscribe teardown function.
 */
export function subscribeHealthSignals(listener: (signal: HealthSignal) => void): () => void {
  inMemorySubscribers.add(listener);

  return () => {
    inMemorySubscribers.delete(listener);
  };
}

export function getRecentHealthSignals(): readonly HealthSignal[] {
  return recentSignals;
}

/**
 * Runs a rapid synthetic diagnostic check (<15ms) across all vital client subsystems.
 */
export async function runSyntheticHealthCheck(): Promise<SystemHealthReport> {
  const warnings: string[] = [];

  // 1. Storage Integrity Probe (Quota & Incognito)
  let storageCheck: SubsystemCheck = { status: 'pass', detail: 'Local & session storage operational' };
  const testKey = `__tn_health_probe_${Date.now()}`;
  try {
    if (typeof window === 'undefined' || !window.localStorage || !window.sessionStorage) {
      storageCheck = { status: 'warn', detail: 'Storage APIs unavailable in current execution context' };
    } else {
      let read: string | null = null;
      try {
        localStorage.setItem(testKey, '1');
        read = localStorage.getItem(testKey);
      } finally {
        try { localStorage.removeItem(testKey); } catch { /* ignore */ }
      }

      try {
        sessionStorage.setItem(testKey, '1');
      } finally {
        try { sessionStorage.removeItem(testKey); } catch { /* ignore */ }
      }

      if (read !== '1') {
        storageCheck = { status: 'fail', detail: 'Storage read verification failed' };
        warnings.push('Storage read mismatch');
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Storage blocked';
    storageCheck = { status: 'fail', detail: `Storage inaccessible: ${msg}` };
    warnings.push('Local storage is restricted or full');
  }

  // 2. Audio Subsystem Probe
  let audioCheck: SubsystemCheck = { status: 'pass', detail: 'Web Audio API supported and ready' };
  if (typeof window !== 'undefined') {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        audioCheck = { status: 'warn', detail: 'Web Audio API not supported in this environment' };
        warnings.push('Web Audio unavailable');
      } else {
        const tempCtx = new AudioCtx();
        try {
          const state = tempCtx.state;
          if (state === 'suspended') {
            audioCheck = {
              status: 'warn',
              detail: 'AudioContext is suspended (browser requires user keystroke/click to activate)',
              state,
            };
            warnings.push('AudioContext suspended by autoplay policy');
          } else {
            audioCheck = { status: 'pass', detail: `AudioContext running (${tempCtx.sampleRate} Hz)`, state };
          }
        } finally {
          tempCtx.close().catch(() => {});
        }
      }
    } catch {
      audioCheck = { status: 'warn', detail: 'Failed to initialize AudioContext probe' };
    }
  }

  // 3. Network & Connectivity Probe
  let networkCheck: SubsystemCheck = { status: 'pass', detail: 'Online (navigator.onLine)' };
  if (typeof navigator !== 'undefined') {
    if (!navigator.onLine) {
      networkCheck = { status: 'fail', detail: 'Browser reports offline status' };
      warnings.push('Device is offline');
    } else {
      const startPing = performance.now();
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 3000) : null;
      try {
        const url = typeof window !== 'undefined' && window.location?.origin
          ? `${window.location.origin}/api/health.json`
          : '/api/health.json';
        const res = await fetch(url, {
          method: 'GET',
          cache: 'no-store',
          signal: controller?.signal,
        });
        const latency = Math.round(performance.now() - startPing);
        if (res.ok) {
          networkCheck = { status: 'pass', detail: `Connected (${latency}ms roundtrip)`, latencyMs: latency };
        } else {
          networkCheck = { status: 'warn', detail: `Edge responded with status ${res.status}` };
          warnings.push(`Edge health probe responded with HTTP ${res.status}`);
        }
      } catch (fetchErr) {
        const isAbort = fetchErr instanceof Error && fetchErr.name === 'AbortError';
        networkCheck = {
          status: 'warn',
          detail: isAbort ? 'Edge health probe timed out (>3000ms)' : 'Local health probe unreachable',
        };
        warnings.push(isAbort ? 'Edge health probe timed out' : 'Edge health probe unreachable');
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    }
  }

  // 4. Supabase Auth & Cloud Integration Probe
  let authCheck: SubsystemCheck = { status: 'pass', detail: 'Supabase client ready' };
  if (!supabase) {
    authCheck = { status: 'warn', detail: 'Supabase credentials not configured (running in Guest mode)' };
  } else {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        authCheck = { status: 'warn', detail: `Session query failed: ${error.message}` };
        warnings.push('Auth session query degraded');
      } else if (data.session) {
        const expiresAt = data.session.expires_at;
        const nowSec = Math.floor(Date.now() / 1000);
        if (expiresAt && expiresAt < nowSec) {
          authCheck = { status: 'warn', detail: 'Auth session expired; token refresh pending' };
          warnings.push('Auth session token expired');
        } else {
          authCheck = { status: 'pass', detail: `Authenticated as ${data.session.user.email || 'operator'}` };
        }
      } else {
        authCheck = { status: 'pass', detail: 'Guest mode (no active cloud session)' };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown';
      authCheck = { status: 'warn', detail: `Auth probe error: ${msg}` };
      warnings.push('Auth session connection error');
    }
  }

  // 5. BYOK AI Inference Readiness Probe
  let aiCheck: SubsystemCheck = { status: 'pass', detail: 'AI configuration verified' };
  try {
    const key = getStoredAIKey();
    const rawUrl = typeof window !== 'undefined' ? (localStorage.getItem(AI_KEYS.byokUrl) || DEFAULT_BASE_URL) : DEFAULT_BASE_URL;
    if (!key) {
      aiCheck = { status: 'pass', detail: 'Guest / Zero-Knowledge mode (Key unconfigured or in session)' };
    } else {
      if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
        aiCheck = { status: 'warn', detail: 'Custom AI Base URL missing HTTP/HTTPS protocol' };
        warnings.push('Invalid AI Provider URL');
      } else {
        aiCheck = { status: 'pass', detail: `BYOK Key ready (${rawUrl})` };
      }
    }
  } catch {
    aiCheck = { status: 'warn', detail: 'Failed reading AI configuration' };
  }

  // Overall Status Calculation
  let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
  const checksList = [storageCheck, audioCheck, authCheck, networkCheck, aiCheck];
  if (checksList.some(c => c.status === 'fail')) {
    overall = 'critical';
  } else if (checksList.some(c => c.status === 'warn')) {
    overall = 'degraded';
  }

  return {
    overall,
    timestamp: Date.now(),
    environment: typeof process !== 'undefined' && process.env?.NODE_ENV === 'test' ? 'test' : 'production',
    checks: {
      storage: storageCheck,
      audio: audioCheck,
      auth: authCheck,
      network: networkCheck,
      ai: aiCheck,
    },
    warnings,
  };
}
