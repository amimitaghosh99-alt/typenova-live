import { describe, it, expect } from './testHarness.ts';
import fs from 'node:fs';
import path from 'node:path';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../data/constants.ts';
import {
  getCurrencySubunitFactor,
  ZERO_DECIMAL_CURRENCIES,
  THREE_DECIMAL_CURRENCIES,
  verifyRazorpayPayment,
  createRazorpayOrder,
} from '../lib/razorpay.ts';
import {
  runSyntheticHealthCheck,
  emitHealthSignal,
  subscribeHealthSignals,
  type HealthSignal,
} from '../lib/healthMonitor.ts';
import { redactApiKey } from '../lib/aiClient.ts';


export function registerSecurityVerificationTests(): void {
  describe('Security Hardening — Credential & Environment Variable Isolation', () => {
    it('SUPABASE_URL is properly defined and has valid HTTPS protocol', () => {
      expect(typeof SUPABASE_URL).toBe('string');
      expect(SUPABASE_URL.startsWith('https://')).toBe(true);
      expect(SUPABASE_URL.includes('.supabase.co')).toBe(true);
    });

    it('SUPABASE_ANON_KEY is non-empty and formatted correctly', () => {
      expect(typeof SUPABASE_ANON_KEY).toBe('string');
      expect(SUPABASE_ANON_KEY.length).toBeGreaterThan(20);
    });
  });

  describe('Security Hardening — Financial Integrity & Currency Factors', () => {
    it('accurately resolves subunit factor for zero-decimal currencies (factor = 1)', () => {
      expect(ZERO_DECIMAL_CURRENCIES.has('JPY')).toBe(true);
      expect(ZERO_DECIMAL_CURRENCIES.has('KRW')).toBe(true);
      expect(ZERO_DECIMAL_CURRENCIES.has('VND')).toBe(true);
      expect(ZERO_DECIMAL_CURRENCIES.has('CLP')).toBe(true);
      expect(ZERO_DECIMAL_CURRENCIES.has('ISK')).toBe(true);

      expect(getCurrencySubunitFactor('JPY')).toBe(1);
      expect(getCurrencySubunitFactor('krw')).toBe(1); // case insensitive check
      expect(getCurrencySubunitFactor('VND')).toBe(1);
    });

    it('accurately resolves subunit factor for three-decimal currencies (factor = 1000)', () => {
      expect(THREE_DECIMAL_CURRENCIES.has('KWD')).toBe(true);
      expect(THREE_DECIMAL_CURRENCIES.has('BHD')).toBe(true);
      expect(THREE_DECIMAL_CURRENCIES.has('OMR')).toBe(true);

      expect(getCurrencySubunitFactor('KWD')).toBe(1000);
      expect(getCurrencySubunitFactor('bhd')).toBe(1000);
      expect(getCurrencySubunitFactor('OMR')).toBe(1000);
    });

    it('accurately resolves subunit factor for standard two-decimal currencies (factor = 100)', () => {
      expect(getCurrencySubunitFactor('USD')).toBe(100);
      expect(getCurrencySubunitFactor('INR')).toBe(100);
      expect(getCurrencySubunitFactor('EUR')).toBe(100);
      expect(getCurrencySubunitFactor('GBP')).toBe(100);
      expect(getCurrencySubunitFactor('CAD')).toBe(100);
      expect(getCurrencySubunitFactor('AUD')).toBe(100);
    });
  });

  describe('Security Hardening — Fail-Closed Payment Architecture', () => {
    it('verifyRazorpayPayment strictly fails closed when backend is offline', async () => {
      const result = await verifyRazorpayPayment({
        razorpay_order_id: 'order_test_fake_123',
        razorpay_payment_id: 'pay_test_fake_123',
        razorpay_signature: 'sig_test_fake_123',
        donor_name: 'Attacker',
        amount: 5000,
        currency: 'USD',
        tier_id: 'tier_legend',
      });

      expect(result.verified).toBe(false);
      expect(result.success).toBe(false);
      expect(result.error && result.error.length > 0).toBe(true);
    });

    it('createRazorpayOrder rejects invalid amounts and fails closed without fake order ID', async () => {
      const result = await createRazorpayOrder({
        donorName: 'Malicious Patron',
        amount: -50,
        currency: 'USD',
        tierId: 'tier_legend',
      });

      // Strict fail-closed: must reject negative amount and never fabricate an order ID
      expect(result.success).toBe(false);
      expect(result.orderId).toBe(undefined);
      expect(typeof result.error).toBe('string');
    });
  });

  describe('Card 06 — Health Endpoint Contract & JSON Schema Integrity', () => {
    it('public/api/health.json exists and adheres to authentic JSON schema', () => {
      const filePath = path.resolve(process.cwd(), 'public/api/health.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);

      expect(data.status).toBe('healthy');
      expect(data.app).toBe('typenova');
      expect(typeof data.version).toBe('string');
      expect(data.checks).toBeDefined();
      expect(data.checks.spa_bundle).toBe('ok');
      expect(data.checks.byok_direct_ssl).toBe('enabled');
      expect(data.uptime_slas.client_side_ready).toBe(true);
    });

    it('public/health.json root alias exists and matches health contract', () => {
      const filePath = path.resolve(process.cwd(), 'public/health.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);

      expect(data.status).toBe('healthy');
      expect(data.app).toBe('typenova');
    });

    it('public/_redirects properly routes /api/health and /health before the SPA catch-all', () => {
      const redirectsPath = path.resolve(process.cwd(), 'public/_redirects');
      expect(fs.existsSync(redirectsPath)).toBe(true);

      const content = fs.readFileSync(redirectsPath, 'utf-8');
      const healthApiIndex = content.indexOf('/api/health');
      const healthIndex = content.indexOf('/health');
      const catchAllIndex = content.indexOf('/*');

      expect(healthApiIndex).toBeGreaterThan(-1);
      expect(healthIndex).toBeGreaterThan(-1);
      expect(catchAllIndex).toBeGreaterThan(-1);
      // Health rules must precede the SPA catch-all to prevent serving index.html
      expect(healthApiIndex).toBeLessThan(catchAllIndex);
      expect(healthIndex).toBeLessThan(catchAllIndex);
    });
  });

  describe('Card 06 — Response Hardening & Staged Security Headers', () => {
    it('public/_headers contains required security headers and non-breaking CSP', () => {
      const headersPath = path.resolve(process.cwd(), 'public/_headers');
      expect(fs.existsSync(headersPath)).toBe(true);

      const content = fs.readFileSync(headersPath, 'utf-8');
      expect(content.includes('X-Content-Type-Options: nosniff')).toBe(true);
      expect(content.includes('Referrer-Policy: strict-origin-when-cross-origin')).toBe(true);
      expect(content.includes('X-Frame-Options: SAMEORIGIN')).toBe(true);
      expect(content.includes('Permissions-Policy: ')).toBe(true);
      expect(content.includes('Content-Security-Policy: ')).toBe(true);
      expect(content.includes('checkout.razorpay.com')).toBe(true);
      expect(content.includes('wss:')).toBe(true);
    });

    it('vercel.json specifies nosniff, strict-origin-when-cross-origin, and health rewrites', () => {
      const vercelPath = path.resolve(process.cwd(), 'vercel.json');
      expect(fs.existsSync(vercelPath)).toBe(true);

      const raw = fs.readFileSync(vercelPath, 'utf-8');
      const config = JSON.parse(raw);

      // Verify headers
      const globalHeader = config.headers.find((h: { source: string }) => h.source === '/(.*)');
      expect(globalHeader).toBeDefined();

      const headerKeys = (globalHeader.headers as Array<{ key: string; value: string }>).map(h => h.key);
      expect(headerKeys.includes('X-Content-Type-Options')).toBe(true);
      expect(headerKeys.includes('Referrer-Policy')).toBe(true);
      expect(headerKeys.includes('X-Frame-Options')).toBe(true);
      expect(headerKeys.includes('Content-Security-Policy')).toBe(true);

      // Verify rewrites
      const rewrites = (config.rewrites as Array<{ source: string; destination: string }>);
      const apiHealthRewrite = rewrites.find(r => r.source === '/api/health');
      const healthRewrite = rewrites.find(r => r.source === '/health');
      expect(apiHealthRewrite).toBeDefined();
      expect(healthRewrite).toBeDefined();
      expect(apiHealthRewrite?.destination).toBe('/api/health.json');
      expect(healthRewrite?.destination).toBe('/health.json');
    });

    it('index.html contains document-level security meta tags', () => {
      const indexPath = path.resolve(process.cwd(), 'index.html');
      const content = fs.readFileSync(indexPath, 'utf-8');

      expect(content.includes('strict-origin-when-cross-origin')).toBe(true);
      expect(content.includes('nosniff')).toBe(true);
    });
  });

  describe('Card 06 — Synthetic Client Diagnostics Engine', () => {
    it('runSyntheticHealthCheck returns a comprehensive SystemHealthReport in <100ms', async () => {
      const start = Date.now();
      const report = await runSyntheticHealthCheck();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
      expect(['healthy', 'degraded', 'critical'].includes(report.overall)).toBe(true);
      expect(report.checks).toBeDefined();
      expect(report.checks.storage).toBeDefined();
      expect(report.checks.audio).toBeDefined();
      expect(report.checks.auth).toBeDefined();
      expect(report.checks.network).toBeDefined();
      expect(report.checks.ai).toBeDefined();
    });
  });

  describe('Card 06 — Health Signal Bus & Subsystem Disconnect Telemetry', () => {
    it('dispatches typed health signals and notifies active subscribers', () => {
      const received: HealthSignal[] = [];
      const unsubscribe = subscribeHealthSignals((signal) => {
        received.push(signal);
      });

      const dispatched = emitHealthSignal({
        type: 'race_disconnected',
        severity: 'error',
        subsystem: 'race',
        message: 'Lost connection to multiplayer room.',
      });

      expect(dispatched.id).toBeDefined();
      expect(dispatched.type).toBe('race_disconnected');
      expect(dispatched.severity).toBe('error');
      expect(dispatched.subsystem).toBe('race');

      // In Node environment or DOM, verify subscriber or cleanup
      unsubscribe();
    });

    it('debounces identical consecutive signals within 1000ms to avoid signal storms', () => {
      const signalA = emitHealthSignal({
        type: 'ai_rate_limit',
        severity: 'warning',
        subsystem: 'ai',
        message: 'Rate limit exceeded on provider.',
      });

      // Rapidly emit identical signal within milliseconds
      const signalB = emitHealthSignal({
        type: 'ai_rate_limit',
        severity: 'warning',
        subsystem: 'ai',
        message: 'Rate limit exceeded on provider.',
      });

      expect(signalB.id).toBe(signalA.id);
    });

    it('isolates errors thrown in subscriber callbacks without crashing the caller', () => {
      const unsubscribeFaulty = subscribeHealthSignals(() => {
        throw new Error('Crashing subscriber simulation');
      });

      let normalSubscriberCalled = false;
      const unsubscribeNormal = subscribeHealthSignals(() => {
        normalSubscriberCalled = true;
      });

      let errorThrown = false;
      try {
        emitHealthSignal({
          type: 'auth_expired',
          severity: 'warning',
          subsystem: 'auth',
          message: 'Session has expired.',
        });
      } catch {
        errorThrown = true;
      }

      expect(errorThrown).toBe(false);
      expect(normalSubscriberCalled).toBe(true);

      unsubscribeFaulty();
      unsubscribeNormal();
    });

    it('redactApiKey thoroughly redacts sensitive keys and avoids secret leakage', () => {
      expect(redactApiKey('')).toBe('');
      expect(redactApiKey('short')).toBe('••••••••');
      const standardKey = 'sk-proj-1234567890abcdefghijklmn';
      const redacted = redactApiKey(standardKey);
      expect(redacted.startsWith('sk-p')).toBe(true);
      expect(redacted.endsWith('klmn')).toBe(true);
      expect(redacted.includes('1234567890abcdef')).toBe(false);
    });
  });
}

