import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
  RefreshCw,
  QrCode,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Theme } from '@/data/constants';
import {
  formatCurrency,
  type CurrencyCode,
  recordPatronContribution,
} from '@/data/donation';
import { setActiveTitleId } from '@/data/titles';

export interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  amount: number;
  currency: CurrencyCode;
  onPaymentSuccess: (details: {
    name: string;
    amount: number;
    currency: CurrencyCode;
    txHash: string;
    platform: 'gateway' | 'upi';
  }) => void;
  onOpenCertificate?: (details: { name: string; amount: number }) => void;
}

type PaymentMethod = 'card' | 'upi';
type ProcessingStep = 'idle' | 'encrypting' | 'authenticating' | 'settled' | 'error';

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  onClose,
  theme,
  amount,
  currency,
  onPaymentSuccess,
  onOpenCertificate,
}) => {
  const gp = theme.glowPrimary;

  const [method, setMethod] = useState<PaymentMethod>('card');
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  const [upiVpa, setUpiVpa] = useState('');
  const [step, setStep] = useState<ProcessingStep>('idle');
  const [txHash, setTxHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setStep('idle');
      setErrorMsg('');
      setTxHash('');
    }
  }, [isOpen]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && step !== 'encrypting' && step !== 'authenticating') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, step]);

  // Card brand identification
  const cardBrand = useMemo(() => {
    const clean = cardNumber.replace(/\s+/g, '');
    if (clean.startsWith('4')) return { name: 'Visa', color: 'text-blue-400' };
    if (/^(5[1-5]|2[2-7])/.test(clean)) return { name: 'Mastercard', color: 'text-amber-400' };
    if (/^3[47]/.test(clean)) return { name: 'Amex', color: 'text-emerald-400' };
    if (/^6(011|5)/.test(clean)) return { name: 'Discover', color: 'text-orange-400' };
    return { name: 'Card', color: 'text-zinc-400' };
  }, [cardNumber]);

  // Format Card Number (XXXX XXXX XXXX XXXX)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Format Expiry (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) {
      val = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setExpiry(val);
  };

  // 1-Click Autofill Test Sandbox Credentials
  const handleAutofillTest = () => {
    setCardholderName('Alex V. Contender');
    setCardNumber('4242 4242 4242 4242');
    setExpiry('12/28');
    setCvv('888');
    setUpiVpa('typist@okaxis');
    toast.success('Test sandbox credentials autofilled', {
      description: 'Ready to run high-security checkout simulation.',
    });
  };

  // Simulated Payment Submission Pipeline
  const handlePay = useCallback(async () => {
    setErrorMsg('');

    // Validation
    if (method === 'card') {
      const cleanNum = cardNumber.replace(/\s+/g, '');
      if (!cardholderName.trim()) {
        setErrorMsg('Please enter cardholder callsign or name');
        return;
      }
      if (cleanNum.length < 15) {
        setErrorMsg('Please enter a valid 16-digit card number');
        return;
      }
      if (expiry.length < 5) {
        setErrorMsg('Please enter a valid expiry date (MM/YY)');
        return;
      }
      if (cvv.length < 3) {
        setErrorMsg('Please enter CVV/CVC code');
        return;
      }
    } else {
      if (!upiVpa.includes('@')) {
        setErrorMsg('Please enter a valid UPI VPA (e.g. user@upi)');
        return;
      }
    }

    // Step 1: Encrypting
    setStep('encrypting');
    await new Promise((res) => setTimeout(res, 850));

    // Step 2: 3D Secure Verification
    setStep('authenticating');
    await new Promise((res) => setTimeout(res, 1100));

    // Step 3: Success & Hash Generation
    const randHex = Math.random().toString(36).substring(2, 10).toUpperCase();
    const generatedHash = `TN-${method === 'card' ? 'CARD' : 'UPI'}-${randHex}`;
    setTxHash(generatedHash);
    setStep('settled');

    const donorName = cardholderName.trim() || upiVpa.split('@')[0] || 'Anonymous Benefactor';

    // Record locally for Patron Wall
    recordPatronContribution({
      name: donorName,
      amount,
      platform: 'gateway',
      date: new Date().toISOString().split('T')[0],
      message: 'Verified instant gateway contribution',
      txHash: generatedHash,
    });

    // Auto-equip Cyber Patron title
    setActiveTitleId('cyber_patron');

    onPaymentSuccess({
      name: donorName,
      amount,
      currency,
      txHash: generatedHash,
      platform: method === 'card' ? 'gateway' : 'upi',
    });

    toast.success('Payment settled successfully!', {
      description: `Reference: ${generatedHash}. Cyber Patron perk granted.`,
    });
  }, [
    method,
    cardNumber,
    cardholderName,
    expiry,
    cvv,
    upiVpa,
    amount,
    currency,
    onPaymentSuccess,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      {/* Container Frame */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg rounded-[1.75rem] p-1 bg-white/[0.04] border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.85)] relative overflow-hidden"
      >
        <div className="p-6 sm:p-7 rounded-[calc(1.75rem-0.25rem)] bg-[#0a0d14] border border-white/[0.06] space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} style={{ color: `rgb(${gp})` }} />
                <h3 className="text-base font-bold text-white font-mono tracking-tight">
                  TypeNova Secure Checkout
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  256-Bit SSL
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Direct student tuition &amp; server sustenance contribution
              </p>
            </div>

            <button
              onClick={onClose}
              disabled={step === 'encrypting' || step === 'authenticating'}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-colors disabled:opacity-30 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Amount Badge Banner */}
          <div
            className="p-3.5 rounded-2xl border flex items-center justify-between font-mono"
            style={{
              backgroundColor: `rgba(${gp}, 0.08)`,
              borderColor: `rgba(${gp}, 0.3)`,
            }}
          >
            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                Total Contribution
              </span>
              <span className="text-xl sm:text-2xl font-black text-white">
                {formatCurrency(amount, currency)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-zinc-400 block">FEE WAIVER</span>
              <span className="text-xs font-bold text-emerald-400">0% PLATFORM FEE</span>
            </div>
          </div>

          {/* ═══ STATE: IDLE (FORM) ═══ */}
          {step === 'idle' && (
            <div className="space-y-4">
              {/* Method Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/60 border border-white/10 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setMethod('card')}
                  className={`py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    method === 'card'
                      ? 'bg-white/15 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  style={
                    method === 'card'
                      ? {
                          borderColor: `rgba(${gp}, 0.4)`,
                          color: '#ffffff',
                        }
                      : undefined
                  }
                >
                  <CreditCard size={14} />
                  <span>Credit / Debit Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('upi')}
                  className={`py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    method === 'upi'
                      ? 'bg-white/15 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <QrCode size={14} />
                  <span>UPI / Net Banking</span>
                </button>
              </div>

              {/* CARD FORM */}
              {method === 'card' && (
                <div className="space-y-3 font-mono">
                  {/* Cardholder Name */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 uppercase tracking-wider block">
                      Cardholder Name / Callsign
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Elena Rostova"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/50 transition-colors"
                    />
                  </div>

                  {/* Card Number */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <label className="text-zinc-400 uppercase tracking-wider">
                        Card Number
                      </label>
                      <span className={`font-bold ${cardBrand.color}`}>
                        {cardBrand.name}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="4242 4242 4242 4242"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        className="w-full px-3.5 py-2.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/50 transition-colors tracking-widest font-mono"
                      />
                      <CreditCard
                        size={15}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Expiry & CVV */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400 uppercase tracking-wider block">
                        Expires (MM/YY)
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={expiry}
                        onChange={handleExpiryChange}
                        className="w-full px-3.5 py-2.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/50 transition-colors text-center"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <label className="text-zinc-400 uppercase tracking-wider">
                          CVV / CVC
                        </label>
                        <Lock size={11} className="text-zinc-500" />
                      </div>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="•••"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3.5 py-2.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/50 transition-colors text-center tracking-widest"
                      />
                    </div>
                  </div>

                  {/* Save Card Option */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="save-card-check"
                      checked={saveCard}
                      onChange={(e) => setSaveCard(e.target.checked)}
                      className="rounded border-white/20 bg-black/40 text-amber-400 focus:ring-0 cursor-pointer"
                    />
                    <label
                      htmlFor="save-card-check"
                      className="text-[11px] text-zinc-400 cursor-pointer select-none"
                    >
                      Remember for future faster typing community contributions
                    </label>
                  </div>
                </div>
              )}

              {/* UPI FORM */}
              {method === 'upi' && (
                <div className="space-y-3 font-mono">
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 uppercase tracking-wider block">
                      Virtual Payment Address (UPI VPA)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. mobile@upi or name@okaxis"
                      value={upiVpa}
                      onChange={(e) => setUpiVpa(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/50 transition-colors"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">
                      A payment request collect prompt will be simulated to your UPI application.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs font-mono">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Quick Autofill Test Button */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleAutofillTest}
                  className="text-[11px] font-mono text-zinc-400 hover:text-white underline underline-offset-4 decoration-white/20 hover:decoration-white transition-colors cursor-pointer"
                >
                  ⚡ Autofill test credentials
                </button>

                <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                  <Lock size={10} />
                  <span>End-to-end encrypted</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handlePay}
                className="w-full py-3.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg border"
                style={{
                  backgroundColor: `rgb(${gp})`,
                  color: '#000000',
                  borderColor: `rgb(${gp})`,
                  boxShadow: `0 0 24px rgba(${gp}, 0.35)`,
                }}
              >
                <Lock size={14} />
                <span>CONFIRM &amp; PAY {formatCurrency(amount, currency)}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* ═══ STATE: ENCRYPTING / AUTHENTICATING ═══ */}
          {(step === 'encrypting' || step === 'authenticating') && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center font-mono">
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: `rgba(${gp}, 0.2)`, borderTopColor: `rgb(${gp})` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Lock size={20} style={{ color: `rgb(${gp})` }} />
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">
                  {step === 'encrypting'
                    ? 'Encrypting Cardholder Payload (AES-256)...'
                    : 'Awaiting 3D Secure / Bank Settlement...'}
                </h4>
                <p className="text-xs text-zinc-400 max-w-xs">
                  {step === 'encrypting'
                    ? 'Secure token handshake with payment gateway network'
                    : 'Direct settlement to student tuition & cloud infrastructure fund'}
                </p>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                <RefreshCw size={11} className="animate-spin" />
                <span>Do not close or refresh this tab</span>
              </div>
            </div>
          )}

          {/* ═══ STATE: SETTLED & CONFIRMED ═══ */}
          {step === 'settled' && (
            <div className="space-y-5 py-2 font-mono text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <CheckCircle2 size={30} />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-black text-white tracking-tight">
                  Transaction Settled &amp; Verified!
                </h4>
                <p className="text-xs text-zinc-300 max-w-sm mx-auto">
                  Thank you for powering TypeNova. Your contribution directly funds college semester fees and high-tick servers.
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 text-left space-y-2 text-xs">
                <div className="flex justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-zinc-400">Reference:</span>
                  <span className="font-bold text-white tracking-wider">{txHash}</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-zinc-400">Amount Paid:</span>
                  <span className="font-bold text-emerald-400">
                    {formatCurrency(amount, currency)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-zinc-400">Granted Title:</span>
                  <span className="font-bold text-white flex items-center gap-1" style={{ color: `rgb(${gp})` }}>
                    <Sparkles size={11} />
                    <span>Cyber Patron (Equipped)</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Patron Wall:</span>
                  <span className="font-bold text-zinc-200">Added to Live Ledger</span>
                </div>
              </div>

              {/* Post-Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {onOpenCertificate && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCertificate({
                        name: cardholderName.trim() || 'Benefactor',
                        amount,
                      });
                    }}
                    className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Award size={14} />
                    <span>VIEW DIGITAL CERTIFICATE</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border"
                  style={{
                    backgroundColor: `rgb(${gp})`,
                    color: '#000000',
                    borderColor: `rgb(${gp})`,
                  }}
                >
                  <span>RETURN TO VAULT</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
};
