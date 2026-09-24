/**
 * TypeNova - Razorpay Client SDK & Edge Function Bridge
 *
 * Handles dynamic script injection for checkout.js, order creation via
 * Supabase Edge Functions, and secure signature verification.
 */

import { supabase } from '@/lib/supabase';

export const RAZORPAY_KEY_ID =
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_RAZORPAY_KEY_ID as string)) || '';

/** Tier→Title mapping (must stay in sync with edge function mapping) */
export const TIER_TITLE_MAP: Record<string, string> = {
  tier_supporter: 'cyber_patron',
  tier_sustainer: 'server_sustainer',
  tier_scholar: 'grand_architect',
  tier_legend: 'eternal_benefactor',
};

export interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number; // in smallest currency unit (e.g. paise)
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id?: string;
  handler: (response: RazorpayPaymentResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
    method?: 'upi' | 'card' | 'netbanking';
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
    backdrop_color?: string;
  };
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    confirm_close?: boolean;
  };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, callback: (response: unknown) => void) => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let scriptPromise: Promise<boolean> | null = null;

/**
 * Dynamically loads the official Razorpay Checkout SDK (checkout.js)
 * Idempotent: caches the script tag so it only loads once.
 */
export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = (err) => {
        console.error('[Razorpay] Failed to load checkout.js:', err);
        scriptPromise = null;
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  return scriptPromise;
}

export interface CreateOrderParams {
  amount: number;
  currency?: string;
  donorName: string;
  tierId?: string;
  userId?: string | null;
  message?: string;
}

export interface CreateOrderResult {
  success: boolean;
  orderId?: string;
  keyId: string;
  amount: number;
  currency: string;
  error?: string;
}

export const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW',
  'MGA', 'PYG', 'RWF', 'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
]);

export const THREE_DECIMAL_CURRENCIES = new Set([
  'BHD', 'JOD', 'KWD', 'OMR', 'TND', 'LYD'
]);

export function getCurrencySubunitFactor(currency: string): number {
  const c = String(currency).toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(c)) return 1;
  if (THREE_DECIMAL_CURRENCIES.has(c)) return 1000;
  return 100;
}

/**
 * Creates a verified Razorpay order via Supabase Edge Functions.
 * Fails closed if edge function is unreachable to prevent order tampering.
 */
export async function createRazorpayOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const currency = params.currency || 'INR';
  const factor = getCurrencySubunitFactor(currency);
  const amountInPaise = Math.round(params.amount * factor);

  if (!supabase) {
    return {
      success: false,
      keyId: RAZORPAY_KEY_ID,
      amount: amountInPaise,
      currency,
      error: 'Backend service unavailable. Please check your network connection.',
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
      body: {
        amount: params.amount,
        currency,
        donorName: params.donorName,
        tierId: params.tierId,
        userId: params.userId,
        message: params.message,
      },
    });

    if (!error && data?.success && data?.orderId) {
      return {
        success: true,
        orderId: data.orderId,
        keyId: data.keyId || RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
      };
    }

    const errorMsg = error?.message || data?.error || 'Failed to initialize order with payment gateway';
    console.warn('[Razorpay] Order creation failed:', errorMsg);
    return {
      success: false,
      keyId: RAZORPAY_KEY_ID,
      amount: amountInPaise,
      currency,
      error: errorMsg,
    };
  } catch (e) {
    console.error('[Razorpay] Edge function invoke exception:', e);
    return {
      success: false,
      keyId: RAZORPAY_KEY_ID,
      amount: amountInPaise,
      currency,
      error: (e as Error).message || 'Failed to communicate with payment gateway',
    };
  }
}

export interface VerifyPaymentParams {
  razorpay_order_id?: string;
  razorpay_payment_id: string;
  razorpay_signature?: string;
  donor_name: string;
  amount: number;
  currency?: string;
  tier_id?: string;
  user_id?: string | null;
  message?: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  verified: boolean;
  titleId?: string;
  error?: string;
}

/**
 * Verifies Razorpay payment signature cryptographically via Supabase Edge Function
 * and updates public.patron_contributions table.
 * Strictly fails closed if backend is offline.
 */
export async function verifyRazorpayPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
  if (!supabase) {
    return {
      success: false,
      verified: false,
      error: 'Verification backend unreachable. Offline verification is not permitted.',
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
      body: params,
    });

    if (!error && data?.success && data?.verified) {
      return {
        success: true,
        verified: true,
        titleId: data.titleId || 'cyber_patron',
      };
    }

    const errorMsg = error?.message || data?.error || 'Payment verification failed.';
    console.warn('[Razorpay] Verification rejected:', errorMsg);
    return {
      success: false,
      verified: false,
      error: errorMsg,
    };
  } catch (e) {
    console.error('[Razorpay] Verification edge function invoke exception:', e);
    return {
      success: false,
      verified: false,
      error: (e as Error).message || 'Verification service unreachable.',
    };
  }
}
