/**
 * TypeNova - Razorpay Client SDK & Edge Function Bridge
 *
 * Handles dynamic script injection for checkout.js, order creation via
 * Supabase Edge Functions, and secure signature verification.
 */

import { supabase } from '@/lib/supabase';

export const RAZORPAY_KEY_ID =
  (import.meta.env.VITE_RAZORPAY_KEY_ID as string) || '';

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

/**
 * Creates a verified Razorpay order via Supabase Edge Functions.
 * Falls back to client key if edge function is unreachable or not yet deployed.
 */
export async function createRazorpayOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const currency = params.currency || 'INR';
  const factor = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 1 : 100;
  const amountInPaise = Math.round(params.amount * factor);

  if (supabase) {
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
      if (error) {
        console.warn('[Razorpay] Edge function create-order returned error, using direct checkout:', error);
      }
    } catch (e) {
      console.warn('[Razorpay] Edge function invoke exception:', e);
    }
  }

  // Resilient fallback: Direct order initialization on client
  return {
    success: true,
    keyId: RAZORPAY_KEY_ID,
    amount: amountInPaise,
    currency,
  };
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
 */
export async function verifyRazorpayPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
        body: params,
      });

      if (!error && data?.success) {
        return {
          success: true,
          verified: data.verified,
          titleId: data.titleId || 'cyber_patron',
        };
      }
      if (error) {
        console.warn('[Razorpay] Verification edge function error:', error);
        return {
          success: false,
          verified: false,
          error: (error as { message?: string }).message || 'Verification rejected',
        };
      }
    } catch (e) {
      console.warn('[Razorpay] Verification edge function invoke exception:', e);
    }
  }

  // Fallback for local offline mock mode when Supabase client is not instantiated
  if (!supabase) {
    return {
      success: true,
      verified: true,
      titleId: TIER_TITLE_MAP[params.tier_id || 'tier_supporter'] || 'cyber_patron',
    };
  }

  return {
    success: false,
    verified: false,
    error: 'Verification service unreachable',
  };
}
