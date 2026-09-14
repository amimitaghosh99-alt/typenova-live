import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Crown,
  Zap,
  MessageSquareHeart,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Theme } from '@/data/constants';
import { supabase } from '@/lib/supabase';
import {
  formatCurrency,
  convertCurrency,
  type CurrencyCode,
  recordPatronContribution,
  SUPPORTER_TIERS,
  unlockPatronTitlesForTier,
} from '@/data/donation';
import { setActiveTitleId } from '@/data/titles';
import {
  loadRazorpayScript,
  createRazorpayOrder,
  verifyRazorpayPayment,
  RAZORPAY_KEY_ID,
  TIER_TITLE_MAP,
  type RazorpayPaymentResponse,
} from '@/lib/razorpay';

/* ═══════════════════════════════════════════════════════════════════
   PROPS & TYPES
   ═══════════════════════════════════════════════════════════════════ */

export interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  amount: number;
  currency: CurrencyCode;
  tierId?: string;
  userId?: string | null;
  userCallsign?: string | null;
  onPaymentSuccess: (details: {
    name: string;
    amount: number;
    currency: CurrencyCode;
    txHash: string;
    platform: 'gateway' | 'upi';
    message?: string;
  }) => void;
  onOpenCertificate?: (details: {
    name: string;
    amount: number;
    currency: CurrencyCode;
    tierId?: string;
    txHash?: string;
  }) => void;
}

type PaymentMethod = 'card' | 'upi';
type ProcessingStep = 'idle' | 'encrypting' | 'authenticating' | 'settled' | 'error';

/* ═══════════════════════════════════════════════════════════════════
   ANIMATION PRESETS — Cinematic springs & easing
   ═══════════════════════════════════════════════════════════════════ */

const EXPO_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number];

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: EXPO_OUT } },
  exit: { opacity: 0, transition: { duration: 0.28, ease: EXPO_OUT } },
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.88, y: 60, filter: 'blur(12px)' },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      type: 'spring' as const,
      damping: 32,
      stiffness: 280,
      mass: 0.9,
      delay: 0.05,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: 30,
    filter: 'blur(8px)',
    transition: { duration: 0.25, ease: EXPO_OUT },
  },
};

const staggerContainer = {
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.1 } },
};

const fadeSlideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 28, stiffness: 320 },
  },
};

const methodSwitchVariants = {
  hidden: { opacity: 0, x: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring' as const, damping: 26, stiffness: 300 },
  },
  exit: {
    opacity: 0,
    x: -24,
    scale: 0.96,
    transition: { duration: 0.18, ease: EXPO_OUT },
  },
};

/* ═══════════════════════════════════════════════════════════════════
   FLOATING PARTICLE FIELD — ambient depth effect
   ═══════════════════════════════════════════════════════════════════ */

const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  size: 2.5 + Math.random() * 3.5,
  left: 8 + Math.random() * 84,
  top: 8 + Math.random() * 84,
  opBase: 0.12 + Math.random() * 0.18,
  yTravel: -(25 + Math.random() * 45),
  xTravel: (Math.random() - 0.5) * 35,
  dur: 5 + Math.random() * 4,
  delay: Math.random() * 3,
}));

const FloatingParticles = ({ gp }: { gp: string }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
    {PARTICLES.map((p) => (
      <motion.div
        key={p.id}
        className="absolute rounded-full"
        style={{
          width: p.size,
          height: p.size,
          backgroundColor: `rgba(${gp}, ${p.opBase + 0.1})`,
          left: `${p.left}%`,
          top: `${p.top}%`,
        }}
        animate={{
          y: [0, p.yTravel, 0],
          x: [0, p.xTravel, 0],
          opacity: [p.opBase, p.opBase + 0.35, p.opBase],
          scale: [1, 1.5, 1],
        }}
        transition={{
          duration: p.dur,
          repeat: Infinity,
          delay: p.delay,
          ease: 'easeInOut',
        }}
      />
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════
   ORBITAL SPINNER — processing state visual
   ═══════════════════════════════════════════════════════════════════ */

const OrbitalSpinner = ({ gp, label }: { gp: string; label: string }) => (
  <div className="flex flex-col items-center justify-center py-10 gap-6">
    <div className="relative w-24 h-24">
      {/* Outer ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2"
        style={{ borderColor: `rgba(${gp}, 0.15)` }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
      {/* Middle ring */}
      <motion.div
        className="absolute inset-2 rounded-full border-2 border-dashed"
        style={{ borderColor: `rgba(${gp}, 0.25)` }}
        animate={{ rotate: -360 }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
      />
      {/* Inner ring with accent arc */}
      <motion.div
        className="absolute inset-4 rounded-full"
        style={{
          border: `2.5px solid transparent`,
          borderTopColor: `rgb(${gp})`,
          borderRightColor: `rgba(${gp}, 0.4)`,
          filter: `drop-shadow(0 0 8px rgba(${gp}, 0.5))`,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
      />
      {/* Center lock icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Lock size={20} style={{ color: `rgb(${gp})` }} />
        </motion.div>
      </div>
      {/* Ambient glow */}
      <div
        className="absolute -inset-4 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(${gp}, 0.08) 0%, transparent 70%)`,
        }}
      />
    </div>
    <div className="text-center space-y-1.5">
      <motion.p
        className="text-xs font-mono font-bold text-white tracking-wide"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {label}
      </motion.p>
      <p className="text-[10px] font-mono text-zinc-500">
        Do not close this window
      </p>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════
   CONFETTI BURST — success celebration
   ═══════════════════════════════════════════════════════════════════ */

const CONFETTI = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  angle: (i / 14) * Math.PI * 2,
  dist: 40 + Math.random() * 50,
  size: 3 + Math.random() * 3,
  delay: Math.random() * 0.3,
}));

const ConfettiBurst = ({ gp }: { gp: string }) => (
  <div className="absolute inset-0 pointer-events-none" aria-hidden>
    {CONFETTI.map((c) => (
      <motion.div
        key={c.id}
        className="absolute rounded-full"
        style={{
          width: c.size,
          height: c.size,
          backgroundColor: `rgba(${gp}, 0.7)`,
          left: '50%',
          top: '50%',
        }}
        initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
        animate={{
          x: Math.cos(c.angle) * c.dist,
          y: Math.sin(c.angle) * c.dist,
          scale: [0, 1.5, 0],
          opacity: [1, 0.8, 0],
        }}
        transition={{
          duration: 0.9,
          delay: c.delay + 0.2,
          ease: EXPO_OUT,
        }}
      />
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  onClose,
  theme,
  amount: rawAmount,
  currency,
  tierId = 'tier_supporter',
  userId = null,
  userCallsign = null,
  onPaymentSuccess,
  onOpenCertificate,
}) => {
  const gp = theme.glowPrimary;

  /* ── Tier data lookup & strict minimum amount enforcement ── */
  const tier = useMemo(
    () => SUPPORTER_TIERS.find((t) => t.id === tierId) || SUPPORTER_TIERS[0],
    [tierId]
  );

  const minTierAmount = useMemo(() => {
    return Math.max(1, convertCurrency(tier.usdAmount, 'USD', currency));
  }, [tier.usdAmount, currency]);

  // Under NO circumstances can amount be 0 or negative. Minimum contribution is 1 unit.
  const amount = useMemo(() => {
    if (typeof rawAmount !== 'number' || isNaN(rawAmount) || rawAmount < 1) {
      return minTierAmount;
    }
    return Math.max(1, Math.round(rawAmount));
  }, [rawAmount, minTierAmount]);

  /* ── State ── */
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [cardholderName, setCardholderName] = useState(userCallsign || '');
  const [patronMessage, setPatronMessage] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [upiVpa, setUpiVpa] = useState('');
  const [step, setStep] = useState<ProcessingStep>('idle');
  const [txHash, setTxHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSimulationMode, setIsSimulationMode] = useState(false);

  /* ── Reset on open ── */
  useEffect(() => {
    if (isOpen) {
      setStep('idle');
      setErrorMsg('');
      setTxHash('');
      setIsSimulationMode(false);
      setPatronMessage('');
      if (userCallsign && (!cardholderName.trim() || cardholderName === 'Alex V. Contender' || cardholderName === 'Anonymous Patron')) {
        setCardholderName(userCallsign);
      }
    }
  }, [isOpen, userCallsign]);

  /* ── Escape key ── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && step !== 'encrypting' && step !== 'authenticating') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, step]);

  /* ── Card brand ── */
  const cardBrand = useMemo(() => {
    const clean = cardNumber.replace(/\s+/g, '');
    if (clean.startsWith('4')) return { name: 'Visa', color: 'text-blue-400' };
    if (/^(5[1-5]|2[2-7])/.test(clean)) return { name: 'Mastercard', color: 'text-amber-400' };
    if (/^3[47]/.test(clean)) return { name: 'Amex', color: 'text-emerald-400' };
    if (/^6(011|5)/.test(clean)) return { name: 'Discover', color: 'text-orange-400' };
    return { name: 'Card', color: 'text-zinc-400' };
  }, [cardNumber]);

  /* ── Input formatters ── */
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    setCardNumber(val.replace(/(\d{4})(?=\d)/g, '$1 '));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) val = `${val.slice(0, 2)}/${val.slice(2)}`;
    setExpiry(val);
  };

  /* ── Payment execution pipeline ── */
  const handlePay = useCallback(async () => {
    setErrorMsg('');

    if (!amount || amount <= 0) {
      setErrorMsg('A valid contribution amount is required to back this tier.');
      return;
    }

    const fallbackName = userCallsign?.trim() || 'Anonymous Patron';
    const donorName =
      cardholderName.trim() || (upiVpa ? upiVpa.split('@')[0] : '') || fallbackName;
    const customMessage = patronMessage.trim() || undefined;

    // ── Mode A: Sandbox Simulation ──
    if (isSimulationMode) {
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
      } else {
        if (!upiVpa.includes('@')) {
          setErrorMsg('Please enter a valid UPI VPA (e.g. user@upi)');
          return;
        }
      }

      setStep('encrypting');
      await new Promise((res) => setTimeout(res, 800));
      setStep('authenticating');
      await new Promise((res) => setTimeout(res, 1000));

      const randHex = Math.random().toString(36).substring(2, 10).toUpperCase();
      const simHash = `TN-SIM-${randHex}`;
      setTxHash(simHash);
      setStep('settled');

      recordPatronContribution({
        name: donorName,
        amount,
        currency,
        tierId,
        platform: 'gateway',
        date: new Date().toISOString().split('T')[0],
        message: customMessage,
        txHash: simHash,
      });

      onPaymentSuccess({
        name: donorName,
        amount,
        currency,
        txHash: simHash,
        platform: method === 'card' ? 'gateway' : 'upi',
        message: customMessage,
      });

      toast.success('Simulation completed!', {
        description: `Reference: ${simHash}. (Sandbox test mode — real titles unlock on live payment)`,
      });
      return;
    }

    // ── Mode B: Live Razorpay Gateway ──
    try {
      setStep('encrypting');

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        throw new Error('Could not initialize Razorpay checkout. Check your internet connection.');
      }

      const orderData = await createRazorpayOrder({
        amount,
        currency,
        donorName,
        tierId,
        userId,
        message: customMessage,
      });

      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to initialize payment with gateway');
      }

      const rzp = new window.Razorpay({
        key: orderData.keyId || RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'TypeNova',
        description: `Supporter Contribution (${formatCurrency(amount, currency)})`,
        image: '/favicon.ico',
        order_id: orderData.orderId,
        notes: {
          donorName,
          tierId,
          message: customMessage || '',
        },
        prefill: {
          name: donorName !== 'Anonymous Patron' ? donorName : (userCallsign || undefined),
          method: method === 'upi' ? 'upi' : 'card',
        },
        theme: {
          color: `rgb(${gp})`,
        },
        handler: async (response: RazorpayPaymentResponse) => {
          try {
            setStep('authenticating');

            const verification = await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              donor_name: donorName,
              amount,
              currency,
              tier_id: tierId,
              user_id: userId,
              message: customMessage,
            });

            const paymentId = response.razorpay_payment_id;
            setTxHash(paymentId);
            setStep('settled');

            recordPatronContribution({
              name: donorName,
              amount,
              currency,
              platform: 'gateway',
              date: new Date().toISOString().split('T')[0],
              message: customMessage,
              txHash: paymentId,
              tierId,
            });

            if (supabase && customMessage) {
              try {
                await supabase
                  .from('patron_contributions')
                  .update({ message: customMessage })
                  .eq('razorpay_payment_id', paymentId);
              } catch {
                // non-blocking
              }
            }

            unlockPatronTitlesForTier(tierId);
            if (verification.titleId) {
              setActiveTitleId(verification.titleId);
            }

            onPaymentSuccess({
              name: donorName,
              amount,
              currency,
              txHash: paymentId,
              platform: method === 'card' ? 'gateway' : 'upi',
              message: customMessage,
            });

            toast.success('Payment verified & completed!', {
              description: `Transaction: ${paymentId}. Title unlocked.`,
            });
          } catch (verifyErr) {
            console.error('[Razorpay] Verification error:', verifyErr);
            setErrorMsg((verifyErr as Error).message || 'Payment signature verification failed');
            setStep('error');
          }
        },
        modal: {
          ondismiss: () => {
            setStep('idle');
            toast.info('Payment cancelled');
          },
        },
      });

      rzp.open();
    } catch (err) {
      console.error('[Razorpay] Checkout launch error:', err);
      setErrorMsg((err as Error).message || 'Unable to open payment gateway');
      setStep('error');
    }
  }, [
    isSimulationMode,
    method,
    cardNumber,
    cardholderName,
    patronMessage,
    upiVpa,
    amount,
    currency,
    tierId,
    userId,
    userCallsign,
    gp,
    onPaymentSuccess,
  ]);

  if (!isOpen) return null;

  /* ── Shared tokens ── */
  const inputCls =
    'w-full px-4 py-3 bg-white/[0.04] border border-white/[0.1] rounded-xl text-[13px] text-white placeholder-zinc-500 focus:outline-none focus:border-white/25 focus:bg-white/[0.06] transition-all duration-200 font-mono backdrop-blur-sm';

  const titleDisplay = (TIER_TITLE_MAP[tierId] || 'cyber_patron')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="payment-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          style={{
            background: `radial-gradient(ellipse 90% 50% at 50% 25%, rgba(${gp}, 0.07), transparent 65%), rgba(0, 0, 0, 0.85)`,
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          }}
          onClick={(e) => {
            if (
              e.target === e.currentTarget &&
              step !== 'encrypting' &&
              step !== 'authenticating'
            )
              onClose();
          }}
        >
          {/* ═══ PANEL ═══ */}
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full rounded-[2rem] p-[1px] relative my-auto"
            style={{
              maxWidth: 'clamp(360px, 92vw, 500px)',
              background: `linear-gradient(165deg, rgba(${gp}, 0.25) 0%, rgba(255,255,255,0.06) 35%, rgba(${gp}, 0.1) 100%)`,
            }}
          >
            {/* Ambient glow */}
            <div
              className="absolute -inset-1 rounded-[2.25rem] pointer-events-none"
              style={{
                boxShadow: `0 35px 90px -25px rgba(${gp}, 0.18), 0 0 0 1px rgba(255,255,255,0.03)`,
              }}
              aria-hidden
            />

            {/* Inner obsidian card */}
            <div className="relative rounded-[calc(2rem-1px)] bg-[#080b12]/95 backdrop-blur-2xl overflow-hidden">
              <FloatingParticles gp={gp} />

              {/* Subtle noise texture */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
                  backgroundSize: '24px 24px',
                }}
                aria-hidden
              />

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="relative z-10 p-5 sm:p-7 space-y-5"
              >
                {/* ── HEADER ── */}
                <motion.div
                  variants={fadeSlideUp}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{
                          duration: 3.5,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      >
                        <ShieldCheck size={18} style={{ color: `rgb(${gp})` }} />
                      </motion.div>
                      <h3 className="text-sm sm:text-base font-bold text-white font-mono tracking-tight">
                        Secure Checkout
                      </h3>
                      <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                        256-Bit SSL
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-zinc-500 font-mono">
                      Direct server sustenance &amp; independent dev support
                    </p>
                  </div>

                  <motion.button
                    onClick={onClose}
                    disabled={step === 'encrypting' || step === 'authenticating'}
                    className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] transition-all duration-200 disabled:opacity-20 cursor-pointer shrink-0"
                    whileHover={{ scale: 1.08, rotate: 90 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 400 }}
                  >
                    <X size={15} />
                  </motion.button>
                </motion.div>

                {/* ── TIER IDENTITY STRIP ── */}
                <motion.div
                  variants={fadeSlideUp}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${tier.color}18`,
                      border: `1px solid ${tier.color}40`,
                    }}
                  >
                    <Crown size={16} style={{ color: tier.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-mono font-bold truncate"
                        style={{ color: tier.color }}
                      >
                        {tier.name}
                      </span>
                      <span
                        className="text-[8px] font-mono px-1.5 py-0.5 rounded-full font-black tracking-widest shrink-0"
                        style={{
                          backgroundColor: `${tier.color}15`,
                          color: tier.color,
                          border: `1px solid ${tier.color}30`,
                        }}
                      >
                        {tier.badge}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                      Unlocks{' '}
                      <span style={{ color: `rgb(${gp})` }}>
                        &quot;{tier.titleRewardName}&quot;
                      </span>{' '}
                      title
                    </p>
                  </div>
                </motion.div>

                {/* ── AMOUNT HERO ── */}
                <motion.div
                  variants={fadeSlideUp}
                  className="relative p-5 rounded-2xl border overflow-hidden text-center"
                  style={{
                    backgroundColor: `rgba(${gp}, 0.04)`,
                    borderColor: `rgba(${gp}, 0.15)`,
                  }}
                >
                  {/* Shimmer sweep */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `linear-gradient(105deg, transparent 35%, rgba(${gp}, 0.06) 50%, transparent 65%)`,
                      backgroundSize: '250% 100%',
                    }}
                    animate={{ backgroundPosition: ['250% 0', '-250% 0'] }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: 'linear',
                      repeatDelay: 3,
                    }}
                  />
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest relative">
                    Total Contribution
                  </span>
                  <motion.div
                    className="text-4xl sm:text-5xl font-black text-white font-mono mt-1.5 relative"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: 'spring',
                      damping: 16,
                      stiffness: 180,
                      delay: 0.25,
                    }}
                    style={{
                      textShadow: `0 0 40px rgba(${gp}, 0.3), 0 4px 20px rgba(0,0,0,0.5)`,
                    }}
                  >
                    {formatCurrency(amount, currency)}
                  </motion.div>
                  <div className="mt-2 flex items-center justify-center gap-3 relative">
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <Zap size={10} />
                      0% Platform Fee
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-[10px] font-mono text-zinc-500">
                      100% goes to the cause
                    </span>
                  </div>
                </motion.div>

                {/* ═══ STEP STATES ═══ */}
                <AnimatePresence mode="wait">
                  {/* ── IDLE: Checkout Form ── */}
                  {step === 'idle' && (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -14 }}
                      transition={{
                        type: 'spring',
                        damping: 26,
                        stiffness: 300,
                      }}
                      className="space-y-4"
                    >
                      {/* Live Mode: Simplified */}
                      {!isSimulationMode ? (
                        <div className="space-y-4">
                          {/* Donor name */}
                          <div className="space-y-1.5 font-mono">
                            <label className="text-[11px] text-zinc-400 uppercase tracking-wider block">
                              Display Name / Callsign
                            </label>
                            <input
                              type="text"
                              placeholder={userCallsign ? userCallsign : "e.g. Elena Rostova (shown on Patron Wall)"}
                              value={cardholderName}
                              onChange={(e) => setCardholderName(e.target.value)}
                              className={inputCls}
                              data-keyboard-isolated
                            />
                          </div>

                          {/* Message on Board */}
                          <div className="space-y-1.5 font-mono">
                            <div className="flex items-center justify-between text-[11px]">
                              <label className="text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <MessageSquareHeart size={12} style={{ color: `rgb(${gp})` }} />
                                <span>Message on Board</span>
                                <span className="text-zinc-500 font-normal lowercase">(optional)</span>
                              </label>
                              <span className="text-[10px] text-zinc-500">{patronMessage.length}/140</span>
                            </div>
                            <input
                              type="text"
                              maxLength={140}
                              placeholder="e.g. Keep building! Loving the typing experience."
                              value={patronMessage}
                              onChange={(e) => setPatronMessage(e.target.value)}
                              className={inputCls}
                              data-keyboard-isolated
                            />
                          </div>

                          {/* Method preference */}
                          <div className="space-y-1.5 font-mono">
                            <label className="text-[11px] text-zinc-400 uppercase tracking-wider block">
                              Preferred Method
                            </label>
                            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/[0.06] text-xs">
                              {(['card', 'upi'] as const).map((m) => (
                                <motion.button
                                  key={m}
                                  type="button"
                                  onClick={() => setMethod(m)}
                                  className={`relative py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer overflow-hidden ${
                                    method === m
                                      ? 'text-white'
                                      : 'text-zinc-400 hover:text-zinc-200'
                                  }`}
                                  whileTap={{ scale: 0.97 }}
                                >
                                  {method === m && (
                                    <motion.div
                                      layoutId="method-pill-live"
                                      className="absolute inset-0 rounded-lg"
                                      style={{
                                        backgroundColor: `rgba(${gp}, 0.1)`,
                                        border: `1px solid rgba(${gp}, 0.25)`,
                                        boxShadow: `0 0 14px rgba(${gp}, 0.12)`,
                                      }}
                                      transition={{
                                        type: 'spring',
                                        damping: 30,
                                        stiffness: 400,
                                      }}
                                    />
                                  )}
                                  <span className="relative z-10 flex items-center gap-2">
                                    {m === 'card' ? (
                                      <CreditCard size={13} />
                                    ) : (
                                      <QrCode size={13} />
                                    )}
                                    <span>
                                      {m === 'card' ? 'Card' : 'UPI / NetBanking'}
                                    </span>
                                  </span>
                                </motion.button>
                              ))}
                            </div>
                            <p className="text-[10px] text-zinc-500 leading-relaxed">
                              Razorpay&apos;s secure checkout handles all payment details.
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* Sandbox Mode: Full Form */
                        <>
                          {/* Method Switcher */}
                          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/[0.06] font-mono text-xs">
                            {(['card', 'upi'] as const).map((m) => (
                              <motion.button
                                key={m}
                                type="button"
                                onClick={() => setMethod(m)}
                                className={`relative py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer overflow-hidden ${
                                  method === m
                                    ? 'text-white'
                                    : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                                whileTap={{ scale: 0.97 }}
                              >
                                {method === m && (
                                  <motion.div
                                    layoutId="method-pill-sandbox"
                                    className="absolute inset-0 rounded-lg"
                                    style={{
                                      backgroundColor: `rgba(${gp}, 0.1)`,
                                      border: `1px solid rgba(${gp}, 0.25)`,
                                      boxShadow: `0 0 14px rgba(${gp}, 0.12)`,
                                    }}
                                    transition={{
                                      type: 'spring',
                                      damping: 30,
                                      stiffness: 400,
                                    }}
                                  />
                                )}
                                <span className="relative z-10 flex items-center gap-2">
                                  {m === 'card' ? (
                                    <CreditCard size={13} />
                                  ) : (
                                    <QrCode size={13} />
                                  )}
                                  <span>
                                    {m === 'card' ? 'Card' : 'UPI / NetBanking'}
                                  </span>
                                </span>
                              </motion.button>
                            ))}
                          </div>

                          {/* Card / UPI form fields */}
                          <AnimatePresence mode="wait">
                            {method === 'card' ? (
                              <motion.div
                                key="card-form"
                                variants={methodSwitchVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="space-y-3 font-mono"
                              >
                                <div className="space-y-1.5">
                                  <label className="text-[11px] text-zinc-400 uppercase tracking-wider block">
                                    Cardholder Name
                                  </label>
                                  <input
                                    type="text"
                                    placeholder={userCallsign ? userCallsign : "e.g. Elena Rostova"}
                                    value={cardholderName}
                                    onChange={(e) =>
                                      setCardholderName(e.target.value)
                                    }
                                    className={inputCls}
                                    data-keyboard-isolated
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <label className="text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                      <MessageSquareHeart size={12} style={{ color: `rgb(${gp})` }} />
                                      <span>Message on Board</span>
                                      <span className="text-zinc-500 font-normal lowercase">(optional)</span>
                                    </label>
                                    <span className="text-[10px] text-zinc-500">{patronMessage.length}/140</span>
                                  </div>
                                  <input
                                    type="text"
                                    maxLength={140}
                                    placeholder="e.g. Keep building! Loving the typing experience."
                                    value={patronMessage}
                                    onChange={(e) => setPatronMessage(e.target.value)}
                                    className={inputCls}
                                    data-keyboard-isolated
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <label className="text-zinc-400 uppercase tracking-wider">
                                      Card Number
                                    </label>
                                    <motion.span
                                      key={cardBrand.name}
                                      initial={{ opacity: 0, x: 8 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      className={`font-bold ${cardBrand.color}`}
                                    >
                                      {cardBrand.name}
                                    </motion.span>
                                  </div>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      placeholder="4242 4242 4242 4242"
                                      value={cardNumber}
                                      onChange={handleCardNumberChange}
                                      className={`${inputCls} pr-10 tracking-widest`}
                                      data-keyboard-isolated
                                    />
                                    <CreditCard
                                      size={14}
                                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <label className="text-[11px] text-zinc-400 uppercase tracking-wider block">
                                      Expiry
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="MM/YY"
                                      value={expiry}
                                      onChange={handleExpiryChange}
                                      className={`${inputCls} text-center`}
                                      data-keyboard-isolated
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <label className="text-zinc-400 uppercase tracking-wider">
                                        CVV
                                      </label>
                                      <Lock size={10} className="text-zinc-500" />
                                    </div>
                                    <input
                                      type="password"
                                      maxLength={4}
                                      placeholder="•••"
                                      value={cvv}
                                      onChange={(e) =>
                                        setCvv(e.target.value.replace(/\D/g, ''))
                                      }
                                      className={`${inputCls} text-center tracking-widest`}
                                      data-keyboard-isolated
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="upi-form"
                                variants={methodSwitchVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="space-y-3 font-mono"
                              >
                                <div className="space-y-1.5">
                                  <label className="text-[11px] text-zinc-400 uppercase tracking-wider block">
                                    UPI Virtual Payment Address
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. mobile@upi or name@okaxis"
                                    value={upiVpa}
                                    onChange={(e) => setUpiVpa(e.target.value)}
                                    className={inputCls}
                                    data-keyboard-isolated
                                  />
                                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                                    Simulated collect request (sandbox mode).
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}

                      {/* Error Banner */}
                      <AnimatePresence>
                        {errorMsg && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, y: -6 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -6 }}
                            transition={{
                              type: 'spring',
                              damping: 24,
                              stiffness: 320,
                            }}
                            className="overflow-hidden"
                          >
                            <div className="p-3 rounded-xl bg-rose-500/8 border border-rose-500/20 flex items-center gap-2.5 text-rose-400 text-xs font-mono">
                              <AlertCircle size={13} className="shrink-0" />
                              <span>{errorMsg}</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Security & Verification trust badges */}
                      <div className="flex items-center justify-between pt-0.5 text-[10px] font-mono text-zinc-500">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck size={11} style={{ color: `rgb(${gp})` }} />
                          <span>Official Razorpay Checkout</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Lock size={10} />
                          <span>256-Bit Encrypted</span>
                        </span>
                      </div>

                      {/* Submit Button */}
                      <motion.button
                        type="button"
                        onClick={handlePay}
                        disabled={!RAZORPAY_KEY_ID}
                        className="w-full py-3.5 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2.5 cursor-pointer border relative overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed group"
                        style={{
                          backgroundColor: `rgb(${gp})`,
                          color: '#000000',
                          borderColor: `rgba(${gp}, 0.6)`,
                        }}
                        whileHover={{
                          scale: 1.015,
                          boxShadow: `0 0 40px rgba(${gp}, 0.4)`,
                        }}
                        whileTap={{ scale: 0.975 }}
                        transition={{
                          type: 'spring',
                          damping: 22,
                          stiffness: 400,
                        }}
                      >
                        {/* Button shimmer */}
                        <motion.div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background:
                              'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)',
                            backgroundSize: '250% 100%',
                          }}
                          animate={{
                            backgroundPosition: ['250% 0', '-250% 0'],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: 'linear',
                            repeatDelay: 4,
                          }}
                        />
                        <Lock size={13} className="relative z-10" />
                        <span className="relative z-10">
                          PAY {formatCurrency(amount, currency)}
                        </span>
                        <ArrowRight
                          size={13}
                          className="relative z-10 transition-transform group-hover:translate-x-0.5"
                        />
                      </motion.button>

                      {!RAZORPAY_KEY_ID && (
                        <p className="text-[10px] text-amber-400/70 font-mono text-center">
                          Gateway temporarily offline. Please try again shortly.
                        </p>
                      )}
                    </motion.div>
                  )}

                  {/* ── PROCESSING: Encrypting / Authenticating ── */}
                  {(step === 'encrypting' || step === 'authenticating') && (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{
                        type: 'spring',
                        damping: 24,
                        stiffness: 260,
                      }}
                    >
                      <OrbitalSpinner
                        gp={gp}
                        label={
                          step === 'encrypting'
                            ? 'Initializing secure session...'
                            : 'Verifying with Razorpay...'
                        }
                      />
                    </motion.div>
                  )}

                  {/* ── SETTLED: Success Receipt ── */}
                  {step === 'settled' && (
                    <motion.div
                      key="settled"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{
                        type: 'spring',
                        damping: 22,
                        stiffness: 220,
                      }}
                      className="space-y-5 py-4"
                    >
                      {/* Animated checkmark */}
                      <div className="relative mx-auto w-20 h-20">
                        <ConfettiBurst gp={gp} />
                        {/* Glow ring */}
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          style={{
                            border: `2.5px solid rgba(${gp}, 0.4)`,
                            boxShadow: `0 0 35px rgba(${gp}, 0.25)`,
                          }}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            type: 'spring',
                            damping: 12,
                            stiffness: 160,
                            delay: 0.1,
                          }}
                        />
                        {/* Pulse ring */}
                        <motion.div
                          className="absolute -inset-2 rounded-full"
                          style={{
                            border: `1.5px solid rgba(${gp}, 0.2)`,
                          }}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{
                            scale: [0.8, 1.4, 1.4],
                            opacity: [0, 0.5, 0],
                          }}
                          transition={{
                            duration: 1.2,
                            ease: 'easeOut',
                            delay: 0.3,
                          }}
                        />
                        {/* Check icon */}
                        <motion.div
                          className="absolute inset-0 flex items-center justify-center"
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{
                            type: 'spring',
                            damping: 14,
                            stiffness: 200,
                            delay: 0.15,
                          }}
                        >
                          <CheckCircle2
                            size={36}
                            style={{ color: `rgb(${gp})` }}
                          />
                        </motion.div>
                      </div>

                      {/* Heading */}
                      <motion.div
                        className="text-center space-y-1"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: 0.3,
                          type: 'spring',
                          damping: 24,
                          stiffness: 280,
                        }}
                      >
                        <h4 className="text-lg sm:text-xl font-black text-white font-mono tracking-tight">
                          Payment Verified
                        </h4>
                        <p className="text-[11px] text-zinc-400 font-mono">
                          Your contribution has been recorded on the ledger
                        </p>
                      </motion.div>

                      {/* Receipt card */}
                      <motion.div
                        className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-0 font-mono text-[11px] overflow-hidden"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: 0.35,
                          type: 'spring',
                          damping: 24,
                          stiffness: 280,
                        }}
                      >
                        {[
                          {
                            label: 'Reference',
                            value: txHash,
                            color: 'text-white',
                          },
                          {
                            label: 'Amount Paid',
                            value: formatCurrency(amount, currency),
                            color: 'text-emerald-400',
                          },
                          {
                            label: 'Granted Title',
                            value: `${titleDisplay} (Equipped)`,
                            colorStyle: `rgb(${gp})`,
                            icon: true,
                          },
                          {
                            label: 'Patron Wall',
                            value: 'Added to Live Ledger',
                            color: 'text-zinc-200',
                          },
                          ...(patronMessage.trim()
                            ? [
                                {
                                  label: 'Board Message',
                                  value: `"${patronMessage.trim()}"`,
                                  color: 'text-zinc-300 italic',
                                },
                              ]
                            : []),
                        ].map((row, i, arr) => (
                          <motion.div
                            key={row.label}
                            className={`flex justify-between py-2.5 ${
                              i < arr.length - 1
                                ? 'border-b border-white/[0.06]'
                                : ''
                            }`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              delay: 0.45 + i * 0.08,
                              type: 'spring',
                              damping: 24,
                              stiffness: 300,
                            }}
                          >
                            <span className="text-zinc-400">{row.label}:</span>
                            <span
                              className={`font-bold flex items-center gap-1 ${
                                row.color || ''
                              }`}
                              style={
                                row.colorStyle
                                  ? { color: row.colorStyle }
                                  : undefined
                              }
                            >
                              {row.icon && <Sparkles size={10} />}
                              <span
                                className={
                                  row.label === 'Reference'
                                    ? 'tracking-wider'
                                    : ''
                                }
                              >
                                {row.value}
                              </span>
                            </span>
                          </motion.div>
                        ))}
                      </motion.div>

                      {/* Action Buttons */}
                      <motion.div
                        className="flex flex-col sm:flex-row gap-2 pt-1"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: 0.6,
                          type: 'spring',
                          damping: 24,
                          stiffness: 280,
                        }}
                      >
                        {onOpenCertificate && !txHash.startsWith('TN-SIM-') && (
                          <motion.button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenCertificate({
                                name: cardholderName.trim() || userCallsign || 'Benefactor',
                                amount,
                                currency,
                                tierId,
                                txHash,
                              });
                            }}
                            className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.975 }}
                          >
                            <Award size={14} />
                            <span>VIEW CERTIFICATE</span>
                          </motion.button>
                        )}
                        <motion.button
                          type="button"
                          onClick={onClose}
                          className="flex-1 py-3 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border"
                          style={{
                            backgroundColor: `rgb(${gp})`,
                            color: '#000000',
                            borderColor: `rgba(${gp}, 0.6)`,
                          }}
                          whileHover={{
                            scale: 1.02,
                            boxShadow: `0 0 28px rgba(${gp}, 0.35)`,
                          }}
                          whileTap={{ scale: 0.975 }}
                        >
                          <span>RETURN TO VAULT</span>
                        </motion.button>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* ── ERROR ── */}
                  {step === 'error' && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{
                        type: 'spring',
                        damping: 22,
                        stiffness: 240,
                      }}
                      className="space-y-5 py-6 font-mono text-center"
                    >
                      {/* Error icon */}
                      <div className="relative mx-auto w-18 h-18">
                        <motion.div
                          className="mx-auto w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center"
                          style={{
                            boxShadow: '0 0 30px rgba(239, 68, 68, 0.2)',
                          }}
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{
                            type: 'spring',
                            damping: 14,
                            stiffness: 200,
                          }}
                        >
                          <AlertCircle size={28} className="text-rose-400" />
                        </motion.div>
                        {/* Pulse ring */}
                        <motion.div
                          className="absolute inset-0 mx-auto w-16 h-16 rounded-full"
                          style={{
                            border: '2px solid rgba(239, 68, 68, 0.25)',
                          }}
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{
                            scale: [0.5, 1.5, 1.5],
                            opacity: [0, 0.5, 0],
                          }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      </div>

                      <motion.div
                        className="space-y-1.5"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: 0.2,
                          type: 'spring',
                          damping: 24,
                          stiffness: 280,
                        }}
                      >
                        <h4 className="text-base sm:text-lg font-black text-white tracking-tight">
                          Payment Failed
                        </h4>
                        <p className="text-[11px] text-zinc-300 max-w-[300px] mx-auto leading-relaxed">
                          {errorMsg ||
                            'Something went wrong during payment. No amount has been charged.'}
                        </p>
                      </motion.div>

                      {/* Retry / Close */}
                      <motion.div
                        className="flex flex-col sm:flex-row gap-2 pt-1"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: 0.35,
                          type: 'spring',
                          damping: 24,
                          stiffness: 280,
                        }}
                      >
                        <motion.button
                          type="button"
                          onClick={() => {
                            setStep('idle');
                            setErrorMsg('');
                          }}
                          className="flex-1 py-3 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border"
                          style={{
                            backgroundColor: `rgb(${gp})`,
                            color: '#000000',
                            borderColor: `rgba(${gp}, 0.6)`,
                          }}
                          whileHover={{
                            scale: 1.02,
                            boxShadow: `0 0 28px rgba(${gp}, 0.35)`,
                          }}
                          whileTap={{ scale: 0.975 }}
                        >
                          <RefreshCw size={13} />
                          <span>RETRY PAYMENT</span>
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={onClose}
                          className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.975 }}
                        >
                          <X size={13} />
                          <span>CLOSE</span>
                        </motion.button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
