import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Coffee,
  Heart,
  Sparkles,
  ShieldCheck,
  Zap,
  Globe,
  Award,
  QrCode,
  Share2,
  GraduationCap,
  Server,
  BookOpen,
  Code2,
  MessageSquareHeart,
  CreditCard,
  DollarSign,
  Send,
  HelpCircle,
  Lock,
  Crown,
} from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import {
  DONATION_CONFIG,
  getDonationProgressPercent,
  getCombinedPatrons,
  SUPPORTED_CURRENCIES,
  convertCurrency,
  formatCurrency,
  SUPPORTER_TIERS,
  type CurrencyCode,
} from '@/data/donation';
import { getActiveTitleId, setActiveTitleId } from '@/data/titles';
import type { Theme } from '@/data/constants';
import { PaymentGatewayModal } from '@/components/donation/PaymentGatewayModal';
import { SupporterCertificateModal } from '@/components/donation/SupporterCertificateModal';
import { RecordContributionModal } from '@/components/donation/RecordContributionModal';

// Generative avatar color from patron name
const AVATAR_PALETTE = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
];
function getAvatarBg(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

// SVG Progress Ring for tuition goal
function ProgressRing({ percent, size = 100, stroke = 5, glow }: { percent: number; size?: number; stroke?: number; glow: string }) {
  const r = (size - stroke) / 2;
  const c = r * 2 * Math.PI;
  const offset = c - (Math.min(percent, 100) / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`rgb(${glow})`}
        strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px rgba(${glow}, 0.5))`, transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)' }}
      />
    </svg>
  );
}

export interface PatronVaultProps {
  onBack?: () => void;
  theme: Theme;
  onTitleEquipped?: (titleId: string) => void;
}

type PaymentTab = 'upi' | 'card';
type WallFilter = 'all' | 'top' | 'recent';

export const PatronVault: React.FC<PatronVaultProps> = ({
  onBack,
  theme,
  onTitleEquipped,
}) => {
  const [activeTab, setActiveTab] = useState<PaymentTab>('upi');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('INR');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [selectedAmount, setSelectedAmount] = useState<number>(250);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(null);

  const [activeTitle, setActiveTitle] = useState<string>(() => getActiveTitleId());

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [certificateData, setCertificateData] = useState<{
    callsign: string;
    amount: number;
    currency: CurrencyCode;
  }>({
    callsign: 'Benefactor',
    amount: 25,
    currency: 'USD',
  });

  const [wallFilter, setWallFilter] = useState<WallFilter>('all');
  const [patronRefreshCounter, setPatronRefreshCounter] = useState(0);

  const progressPercent = getDonationProgressPercent(DONATION_CONFIG);
  const goal = DONATION_CONFIG.goal;
  const gp = theme.glowPrimary;

  const combinedPatrons = useMemo(() => {
    const list = getCombinedPatrons(DONATION_CONFIG, 20);
    if (wallFilter === 'top') {
      return [...list].sort((a, b) => b.amount - a.amount);
    }
    if (wallFilter === 'recent') {
      return [...list].sort((a, b) => (b.date > a.date ? 1 : -1));
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallFilter, patronRefreshCounter]);

  const activeAmount = useMemo(() => {
    if (isCustomMode) {
      const parsed = parseFloat(customAmount);
      return !isNaN(parsed) && parsed > 0 ? parsed : 10;
    }
    return selectedAmount;
  }, [isCustomMode, customAmount, selectedAmount]);

  const upiInrAmount = useMemo(() => {
    if (selectedCurrency === 'INR') return Math.round(activeAmount);
    return Math.round(convertCurrency(activeAmount, selectedCurrency, 'INR'));
  }, [activeAmount, selectedCurrency]);

  const upiDeepLink = useMemo(() => {
    const vpa = DONATION_CONFIG.upi.upiId;
    const name = encodeURIComponent(DONATION_CONFIG.upi.payeeName);
    const note = encodeURIComponent(DONATION_CONFIG.upi.defaultNote);
    return `upi://pay?pa=${vpa}&pn=${name}&am=${upiInrAmount}&cu=INR&tn=${note}`;
  }, [upiInrAmount]);

  const [upiQrSvg, setUpiQrSvg] = useState<string>('');
  useEffect(() => {
    let active = true;
    QRCode.toString(upiDeepLink, {
      type: 'svg',
      margin: 1,
      color: { dark: '#050608', light: '#ffffff' },
    })
      .then((svg) => {
        if (active) setUpiQrSvg(svg);
      })
      .catch((err) => {
        console.error('UPI QR generation failed:', err);
      });
    return () => {
      active = false;
    };
  }, [upiDeepLink]);

  const handleCurrencyChange = (newCurr: CurrencyCode) => {
    const oldCurr = selectedCurrency;
    setSelectedCurrency(newCurr);
    setIsCustomMode(false);
    const converted = convertCurrency(activeAmount, oldCurr, newCurr);
    const suggested = SUPPORTED_CURRENCIES[newCurr].suggestedAmounts;
    const closest = suggested.reduce((prev, curr) =>
      Math.abs(curr - converted) < Math.abs(prev - converted) ? curr : prev
    );
    setSelectedAmount(closest);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onBack && !isCheckoutOpen && !isCertificateOpen && !isRecordOpen) {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack, isCheckoutOpen, isCertificateOpen, isRecordOpen]);

  const handleCopy = useCallback((text: string, key: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(`${label} copied to clipboard!`, { description: text });
      setTimeout(() => setCopiedKey(null), 2500);
    }
  }, []);

  const handleShare = useCallback(() => {
    const url = window.location.origin + '/donate';
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedKey('share');
      toast.success('Patron Vault URL copied!', { description: url });
      setTimeout(() => setCopiedKey(null), 2500);
    }
  }, []);

  const handleEquipTitle = useCallback(
    (titleId: string, titleName: string) => {
      setActiveTitleId(titleId);
      setActiveTitle(titleId);
      onTitleEquipped?.(titleId);
      toast.success(`Holographic "${titleName}" Title Equipped!`, {
        description: 'Radiating in your dossier, leaderboards, and lobbies.',
      });
    },
    [onTitleEquipped]
  );

  const handlePaymentSuccess = useCallback(
    (details: {
      name: string;
      amount: number;
      currency: CurrencyCode;
      txHash: string;
      platform: 'gateway' | 'upi';
    }) => {
      setCertificateData({
        callsign: details.name,
        amount: details.amount,
        currency: details.currency,
      });
      setPatronRefreshCounter((prev) => prev + 1);
    },
    []
  );

  const getMilestoneIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Server size={16} />;
      case 1:
        return <BookOpen size={16} />;
      case 2:
        return <GraduationCap size={16} />;
      case 3:
        return <Sparkles size={16} />;
      default:
        return <Globe size={16} />;
    }
  };

  const globalPlatforms = [
    {
      name: 'Ko-fi',
      url: DONATION_CONFIG.kofiUrl,
      icon: <Coffee size={18} />,
      tag: '0% Platform Fee',
      description: 'Instant debit/credit card, Apple Pay, Google Pay, or PayPal.',
    },
    {
      name: 'Buy Me a Coffee',
      url: DONATION_CONFIG.buyMeACoffeeUrl,
      icon: <Heart size={18} />,
      tag: '1-Click Checkout',
      description: 'Quick micro-support via mobile browser or desktop.',
    },
    {
      name: 'PayPal.me',
      url: DONATION_CONFIG.paypalUrl,
      icon: <Globe size={18} />,
      tag: '200+ Countries',
      description: 'Direct fiat transfers in multi-currencies worldwide.',
    },
    {
      name: 'GitHub Sponsors',
      url: DONATION_CONFIG.githubSponsorsUrl,
      icon: <Zap size={18} />,
      tag: 'Official Receipts',
      description: 'Back open source developers with verifiable GitHub receipts.',
    },
  ];

  return (
    <div
      className="fixed inset-0 top-[var(--nav-h)] z-[var(--z-content)] overflow-y-auto text-zinc-100 selection:bg-white/20 custom-scrollbar bg-[#07090e]"
    >
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute -top-48 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full blur-[160px] opacity-[0.18] transition-colors duration-700 pointer-events-none"
          style={{ backgroundColor: `rgb(${gp})` }}
        />
        <div
          className="absolute inset-0 opacity-[0.015] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative z-10 w-full px-5 sm:px-8 lg:px-12 py-6 sm:py-8 space-y-8 max-w-[1440px] mx-auto">
        
        {/* Section 1 - Command Strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-4 rounded-full bg-[#0c0f16]/80 backdrop-blur-2xl border border-white/[0.06] px-4 py-2 w-full sm:w-auto overflow-x-auto custom-scrollbar">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-xs font-mono font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft size={14} />
              <span>RETURN</span>
            </button>
            
            <div className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
            
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-300 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: `rgb(${gp})` }} />
              <span>Undergraduate Academic Project</span>
              <span className="text-zinc-500">•</span>
              <span>100% Free & Ad-Free</span>
            </div>
            
            <div className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
            
            <div className="flex items-center gap-2 shrink-0">
              <DollarSign size={14} style={{ color: `rgb(${gp})` }} />
              <select
                value={selectedCurrency}
                onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                className="bg-transparent text-white font-mono text-xs font-bold focus:outline-none cursor-pointer"
              >
                {(Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[]).map((c) => (
                  <option key={c} value={c} className="bg-[#0b0e15] text-white">
                    {c} ({SUPPORTED_CURRENCIES[c].symbol})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
            
            <button
              onClick={() => setIsRecordOpen(true)}
              className="flex items-center gap-1.5 text-xs font-mono font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <Heart size={14} style={{ color: `rgb(${gp})` }} />
              <span>CLAIM BADGE</span>
            </button>
            
            <div className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
            
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-xs font-mono font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              {copiedKey === 'share' ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
              <span>{copiedKey === 'share' ? 'COPIED' : 'SHARE'}</span>
            </button>
          </div>
        </div>

        {/* Section 2 - Cinematic Hero */}
        <div className="py-16 lg:py-24 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-[0.2em] uppercase bg-white/[0.03] border border-white/[0.08] text-zinc-400 mb-6">
            <GraduationCap size={14} style={{ color: `rgb(${gp})` }} />
            <span>STUDENT TUITION & CLOUD INFRASTRUCTURE LEDGER</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-white">
            Fuel TypeNova &{' '}
            <span
              className="inline-block"
              style={{
                color: `rgb(${gp})`,
                textShadow: `0 0 40px rgba(${gp}, 0.4)`,
              }}
            >
              Support My College Studies.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed mt-6">
            TypeNova is engineered entirely by an undergraduate student between lectures, labs, and late nights.
            There is zero venture capital, zero paywalled stats, and zero ad-tracking telemetry.
            Every contribution directly pays down semester tuition fees and maintains the multiplayer servers worldwide.
          </p>
        </div>

        {/* Section 3 - Impact Bento Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="py-10"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Tuition Goal Card (col-span-2) */}
            <div className="col-span-2 rounded-2xl p-px bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
              <div className="rounded-[calc(1rem-1px)] bg-[#0a0d14]/90 p-5 sm:p-6 lg:p-8 flex items-center justify-between h-full backdrop-blur-xl">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 block mb-2">SEMESTER TUITION GOAL</span>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                    ${goal.currentAmount} / ${goal.targetAmount}
                  </div>
                  <div className="text-sm text-zinc-400 mt-2 font-mono">
                    <span style={{ color: `rgb(${gp})` }}>{progressPercent}% funded</span> towards target
                  </div>
                </div>
                <div className="shrink-0 ml-4 hidden sm:block">
                  <ProgressRing percent={progressPercent} size={90} stroke={6} glow={gp} />
                </div>
              </div>
            </div>

            {/* Tests Hosted */}
            <div className="rounded-2xl p-px bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
              <div className="rounded-[calc(1rem-1px)] bg-[#0a0d14]/90 p-5 sm:p-6 lg:p-8 h-full backdrop-blur-xl flex flex-col justify-center">
                <Zap size={24} style={{ color: `rgb(${gp})` }} className="mb-4 opacity-80" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 block mb-1">TESTS HOSTED</span>
                <div className="text-xl sm:text-2xl font-black text-white">128,000+</div>
              </div>
            </div>

            {/* Source Code */}
            <div className="rounded-2xl p-px bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
              <div className="rounded-[calc(1rem-1px)] bg-[#0a0d14]/90 p-5 sm:p-6 lg:p-8 h-full backdrop-blur-xl flex flex-col justify-center">
                <Code2 size={24} style={{ color: `rgb(${gp})` }} className="mb-4 opacity-80" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 block mb-1">SOURCE CODE</span>
                <div className="text-xl sm:text-2xl font-black text-white">GPL v3</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 4 - Payment Terminal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="py-14 sm:py-20"
        >
          <div className="text-center mb-10">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 block mb-2">CHOOSE YOUR SUPPORT METHOD</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Fund TypeNova.</h2>
          </div>

          <div className="max-w-2xl mx-auto mb-8 flex p-1 bg-white/[0.03] rounded-full border border-white/[0.06]">
            <button
              onClick={() => setActiveTab('upi')}
              className={`flex-1 py-3 rounded-full text-sm font-bold font-mono transition-all flex items-center justify-center gap-2 ${
                activeTab === 'upi' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              style={activeTab === 'upi' ? { backgroundColor: `rgba(${gp}, 0.15)`, borderColor: `rgba(${gp}, 0.5)`, boxShadow: `0 0 20px rgba(${gp}, 0.1)` } : {}}
            >
              <QrCode size={16} /> UPI Rail
            </button>
            <button
              onClick={() => setActiveTab('card')}
              className={`flex-1 py-3 rounded-full text-sm font-bold font-mono transition-all flex items-center justify-center gap-2 ${
                activeTab === 'card' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              style={activeTab === 'card' ? { backgroundColor: `rgba(${gp}, 0.15)`, borderColor: `rgba(${gp}, 0.5)`, boxShadow: `0 0 20px rgba(${gp}, 0.1)` } : {}}
            >
              <CreditCard size={16} /> Cards & Fiat
            </button>
          </div>

          <div className="max-w-4xl mx-auto rounded-2xl p-px bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
            <div className="rounded-[calc(1rem-1px)] bg-[#0a0d14]/90 p-5 sm:p-8 lg:p-10 backdrop-blur-xl">
              
              {activeTab === 'upi' && (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-6">
                    <div>
                      <h3 className="text-xl font-black text-white flex items-center gap-2">
                        Instant UPI Gateway
                      </h3>
                      <p className="text-sm text-zinc-400 mt-1">Directly scan using any Indian payment app.</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-mono font-bold">0% Fee</span>
                  </div>

                  <div className="space-y-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 block">SELECT AMOUNT: ~₹{upiInrAmount} INR</span>
                    <div className="flex flex-wrap gap-3">
                      {SUPPORTED_CURRENCIES[selectedCurrency].suggestedAmounts.map((amt) => (
                        <button
                          key={amt}
                          onClick={() => {
                            setIsCustomMode(false);
                            setSelectedAmount(amt);
                          }}
                          className={`px-6 py-3 rounded-xl font-mono text-sm font-bold transition-all border ${
                            !isCustomMode && selectedAmount === amt
                              ? 'bg-white/[0.08] text-white border-white/20'
                              : 'bg-white/[0.02] text-zinc-400 border-white/5 hover:border-white/10 hover:text-zinc-200'
                          }`}
                          style={!isCustomMode && selectedAmount === amt ? { borderColor: `rgba(${gp}, 0.5)`, backgroundColor: `rgba(${gp}, 0.1)`, color: `rgb(${gp})` } : {}}
                        >
                          {SUPPORTED_CURRENCIES[selectedCurrency].symbol}{amt}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setIsCustomMode(true);
                          setCustomAmount('');
                        }}
                        className={`px-6 py-3 rounded-xl font-mono text-sm font-bold transition-all border ${
                          isCustomMode
                            ? 'bg-white/[0.08] text-white border-white/20'
                            : 'bg-white/[0.02] text-zinc-400 border-white/5 hover:border-white/10 hover:text-zinc-200'
                        }`}
                        style={isCustomMode ? { borderColor: `rgba(${gp}, 0.5)`, backgroundColor: `rgba(${gp}, 0.1)`, color: `rgb(${gp})` } : {}}
                      >
                        CUSTOM
                      </button>
                    </div>
                    
                    {isCustomMode && (
                      <div className="flex items-center gap-3 mt-4">
                        <div className="relative flex-1 max-w-xs">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-mono">
                            {SUPPORTED_CURRENCIES[selectedCurrency].symbol}
                          </span>
                          <input
                            type="number"
                            min="1"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            placeholder="Enter amount"
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-mono focus:outline-none focus:border-white/30 transition-colors"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white/[0.02] rounded-2xl p-6 border border-white/[0.05] flex flex-col items-center">
                    <div className="rounded-2xl bg-white p-3 w-48 h-48 mx-auto shadow-2xl relative">
                      {upiQrSvg ? (
                        <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: upiQrSvg }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-100 rounded text-zinc-400">
                          <QrCode size={32} className="animate-pulse" />
                        </div>
                      )}
                      <div className="absolute inset-0 border border-black/5 rounded-2xl pointer-events-none" />
                    </div>
                    
                    <div className="mt-6 flex items-center gap-3">
                      <span className="font-mono text-sm text-zinc-300">{DONATION_CONFIG.upi.upiId}</span>
                      <button
                        onClick={() => handleCopy(DONATION_CONFIG.upi.upiId, 'upi', 'UPI ID')}
                        className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors text-zinc-400 hover:text-white"
                      >
                        {copiedKey === 'upi' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>

                    <a
                      href={upiDeepLink}
                      className="mt-6 sm:hidden w-full py-4 rounded-xl font-bold font-mono text-sm bg-white text-black flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                      <Send size={16} /> PAY VIA UPI APP
                    </a>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => setIsRecordOpen(true)}
                      className="px-6 py-3 rounded-xl font-mono text-sm font-bold text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors inline-flex items-center gap-2"
                    >
                      <Check size={16} className="text-emerald-400" /> I HAVE COMPLETED THIS TRANSFER
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-6 pt-6 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                    <div className="text-xs font-bold font-sans">GPay</div>
                    <div className="text-xs font-bold font-sans">PhonePe</div>
                    <div className="text-xs font-bold font-sans">Paytm</div>
                    <div className="text-xs font-bold font-sans">BHIM</div>
                  </div>
                </div>
              )}

              {activeTab === 'card' && (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-6">
                    <div>
                      <h3 className="text-xl font-black text-white flex items-center gap-2">
                        Instant In-App Checkout
                      </h3>
                      <p className="text-sm text-zinc-400 mt-1">Accepts Visa, Mastercard, Amex via secure gateway.</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-mono font-bold">256-Bit SSL</span>
                  </div>

                  <div className="py-8 text-center">
                    <button
                      onClick={() => setIsCheckoutOpen(true)}
                      className="w-full sm:w-auto px-10 py-5 rounded-2xl font-black text-lg sm:text-xl text-black inline-flex items-center justify-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                      style={{ backgroundColor: `rgb(${gp})`, boxShadow: `0 0 40px rgba(${gp}, 0.3)` }}
                    >
                      <Lock size={20} className="text-black/70" /> LAUNCH SECURE CHECKOUT
                    </button>
                    <div className="mt-4 text-xs text-zinc-500 font-mono">
                      Payments processed instantly. You will be prompted to enter your amount and details.
                    </div>
                  </div>

                  <div className="relative py-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.06]"></div></div>
                    <div className="relative flex justify-center"><span className="bg-[#0a0d14] px-4 text-xs font-mono text-zinc-500 uppercase tracking-widest">— Or choose an external platform —</span></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {globalPlatforms.map((platform, i) => (
                      <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors group">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white/[0.05] text-zinc-300 group-hover:text-white transition-colors">
                              {platform.icon}
                            </div>
                            <span className="font-bold text-white">{platform.name}</span>
                          </div>
                          <span className="text-[9px] font-mono font-bold px-2 py-1 rounded bg-white/[0.05] text-zinc-400">
                            {platform.tag}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mb-4 line-clamp-2">{platform.description}</p>
                        <a
                          href={platform.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono font-bold text-white flex items-center gap-2 hover:underline decoration-white/30 underline-offset-4"
                        >
                          OPEN PLATFORM <ExternalLink size={12} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Section 5 - Supporter Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="py-14 sm:py-20"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-zinc-400 mb-2">
                <Crown size={14} style={{ color: `rgb(${gp})` }} /> TITLES & PERKS
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">Unlock Supporter Titles.</h2>
            </div>
            <button
              onClick={() => {
                setCertificateData({ callsign: 'Benefactor', amount: activeAmount, currency: selectedCurrency });
                setIsCertificateOpen(true);
              }}
              className="px-5 py-2.5 rounded-full font-mono text-xs font-bold text-zinc-300 hover:text-white bg-white/[0.04] border border-white/10 transition-colors flex items-center gap-2 w-fit"
            >
              <Award size={14} style={{ color: `rgb(${gp})` }} /> PREVIEW CERTIFICATE
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SUPPORTER_TIERS.map((tier) => {
              const isEquipped = activeTitle === tier.titleRewardId;
              let gradientBorder = '';
              if (tier.id === 'tier_supporter') gradientBorder = 'from-[#cd7f32]/40 to-[#cd7f32]/10';
              else if (tier.id === 'tier_sustainer') gradientBorder = 'from-[#e0e0e0]/40 to-[#e0e0e0]/10';
              else if (tier.id === 'tier_scholar') gradientBorder = 'from-[#d4af37]/40 to-[#d4af37]/10';
              else if (tier.id === 'tier_legend') gradientBorder = 'from-[#a855f7]/40 to-[#a855f7]/10';
              
              return (
                <div key={tier.id} className={`rounded-2xl p-px bg-gradient-to-b ${gradientBorder} relative`}>
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white text-black text-[9px] font-mono font-black rounded-full shadow-lg z-10 whitespace-nowrap">
                      MOST CHOSEN
                    </div>
                  )}
                  <div className="rounded-[calc(1rem-1px)] bg-[#0a0d14]/90 p-5 sm:p-6 h-full flex flex-col backdrop-blur-xl">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider w-fit mb-4 bg-white/5 border border-white/10" style={{ color: tier.color }}>
                      {tier.badge}
                    </span>
                    <h3 className="text-xl font-black text-white mb-1">{tier.name}</h3>
                    <div className="font-mono text-lg font-bold text-zinc-300 mb-6">
                      ~{formatCurrency(convertCurrency(tier.usdAmount, 'USD', selectedCurrency), selectedCurrency)}
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Rewards</div>
                      <div className="text-sm font-bold" style={{ color: tier.color }}>Title: "{tier.titleRewardName}"</div>
                    </div>
                    
                    <ul className="space-y-3 mb-8 flex-1">
                      {tier.perks.map((perk, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-zinc-400 font-mono">
                          <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <button
                      onClick={() => handleEquipTitle(tier.titleRewardId, tier.titleRewardName)}
                      className={`w-full py-3 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                        isEquipped
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-white/[0.04] border-white/10 text-white hover:bg-white/[0.08]'
                      }`}
                    >
                      {isEquipped ? (
                        <>
                          <Check size={14} strokeWidth={3} /> EQUIPPED
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} /> EQUIP TITLE
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Section 6 - Milestone Roadmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          className="py-14 sm:py-20"
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-zinc-400 mb-2">
              <GraduationCap size={14} style={{ color: `rgb(${gp})` }} /> BUDGET TRANSPARENCY
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">How funds are utilized.</h2>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 sm:gap-0">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 hidden sm:block -translate-y-1/2 pointer-events-none" />
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/5 sm:hidden pointer-events-none" />
              
              {goal.milestones.map((m, idx) => {
                const isReached = goal.currentAmount >= m.amount;
                const isExpanded = expandedMilestone === idx;
                return (
                  <div key={idx} className="relative z-10 flex sm:flex-col items-center gap-4 sm:gap-4 pl-4 sm:pl-0 cursor-pointer group" onClick={() => setExpandedMilestone(isExpanded ? null : idx)}>
                    <div
                      className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all bg-[#07090e] shadow-xl relative ${
                        isReached ? 'border-transparent text-black' : 'border-white/10 text-zinc-500 group-hover:border-white/30'
                      }`}
                      style={isReached ? { backgroundColor: `rgb(${gp})`, boxShadow: `0 0 20px rgba(${gp}, 0.3)` } : {}}
                    >
                      {getMilestoneIcon(idx)}
                      {isExpanded && <div className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-white hidden sm:block" />}
                    </div>
                    <div className="sm:text-center pt-1 sm:pt-0">
                      <div className="font-mono text-sm font-bold text-white">${m.amount}</div>
                      <div className="text-xs text-zinc-400 font-medium mt-1">{m.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <AnimatePresence>
              {expandedMilestone !== null && goal.milestones[expandedMilestone]?.budgetBreakdown && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: 10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: 10 }}
                  className="mt-12 overflow-hidden"
                >
                  <div className="rounded-2xl p-px bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
                    <div className="rounded-[calc(1rem-1px)] bg-[#0a0d14]/90 p-6 sm:p-8 backdrop-blur-xl">
                      <h4 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                        <HelpCircle size={18} style={{ color: `rgb(${gp})` }} />
                        {goal.milestones[expandedMilestone].label} Ledger
                      </h4>
                      <div className="space-y-3">
                        {goal.milestones[expandedMilestone].budgetBreakdown.map((item, i) => (
                          <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                            <div>
                              <div className="font-bold text-white text-sm">{item.item}</div>
                              <div className="text-xs text-zinc-400 mt-1">{item.purpose}</div>
                            </div>
                            <div className="font-mono font-bold mt-3 sm:mt-0" style={{ color: `rgb(${gp})` }}>
                              {item.cost}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Section 7 - Patron Wall */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
          className="py-14 sm:py-20 border-t border-white/[0.06]"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-6">
            <div className="flex items-center gap-3">
              <MessageSquareHeart size={24} style={{ color: `rgb(${gp})` }} />
              <h2 className="text-2xl sm:text-3xl font-black text-white">Community Supporters.</h2>
            </div>
            
            <div className="flex bg-white/[0.03] p-1 rounded-full border border-white/5">
              {(['all', 'top', 'recent'] as WallFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setWallFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-mono font-bold capitalize transition-colors ${
                    wallFilter === f ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {combinedPatrons.map((patron, i) => (
              <div key={i} className="rounded-2xl p-px bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
                <div className="rounded-[calc(1rem-1px)] bg-[#0a0d14]/90 p-5 backdrop-blur-xl h-full flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-inner"
                        style={{ backgroundColor: getAvatarBg(patron.name) }}
                      >
                        {patron.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          {patron.name}
                          {patron.isLocal && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">YOU</span>}
                        </div>
                        <div className="text-xs text-zinc-500 font-mono mt-0.5">
                          {new Date(patron.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-white">${patron.amount}</div>
                      <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{patron.platform}</div>
                    </div>
                  </div>
                  {patron.message && (
                    <div className="mt-auto pt-4 border-t border-white/[0.06] text-sm text-zinc-400 italic">
                      "{patron.message}"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-10 text-center">
            <button
              onClick={() => setIsRecordOpen(true)}
              className="px-6 py-3 rounded-full font-mono text-xs font-bold text-black transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
              style={{ backgroundColor: `rgb(${gp})` }}
            >
              POST YOUR SUPPORT NOTE
            </button>
          </div>
        </motion.div>

        {/* Section 8 - Ethos Footer */}
        <div className="py-10 border-t border-white/[0.06]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex gap-4">
              <Code2 size={24} className="text-emerald-400 shrink-0" />
              <div>
                <h4 className="font-bold text-white mb-1">GPL v3 Copyleft</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">TypeNova is completely free and open source forever. Auditable codebase on GitHub.</p>
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex gap-4">
              <ShieldCheck size={24} className="text-emerald-400 shrink-0" />
              <div>
                <h4 className="font-bold text-white mb-1">Zero Ads / Tracking</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">No cookies, no data monetization, no third-party scripts. Your typing data is private.</p>
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex gap-4">
              <GraduationCap size={24} style={{ color: `rgb(${gp})` }} className="shrink-0" />
              <div>
                <h4 className="font-bold text-white mb-1">Solo Student Maintained</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">Directly sustaining an indie developer's undergraduate studies and server costs.</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500">
            <div className="flex items-center gap-2">
              <Heart size={14} className="text-rose-500 shrink-0" /> Every rupee fuels an undergraduate dream.
            </div>
            <div className="flex items-center gap-4">
              <a href="https://github.com/amimitaghosh99-alt/typenova" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
                GitHub <ExternalLink size={12} />
              </a>
              <span>v3.0.1</span>
            </div>
          </div>
        </div>
      </div>

      <PaymentGatewayModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        theme={theme}
        amount={activeAmount}
        currency={selectedCurrency}
        onPaymentSuccess={handlePaymentSuccess}
        onOpenCertificate={(data) => {
          setCertificateData({
            callsign: data.name,
            amount: data.amount,
            currency: selectedCurrency,
          });
          setIsCertificateOpen(true);
        }}
      />

      <SupporterCertificateModal
        isOpen={isCertificateOpen}
        onClose={() => setIsCertificateOpen(false)}
        theme={theme}
        callsign={certificateData.callsign}
        amount={certificateData.amount}
        currency={certificateData.currency}
      />

      <RecordContributionModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        theme={theme}
        defaultAmount={activeAmount}
        defaultCurrency={selectedCurrency}
        onContributionRecorded={(name, amt) => {
          setCertificateData({
            callsign: name,
            amount: amt,
            currency: selectedCurrency,
          });
          setPatronRefreshCounter((prev) => prev + 1);
        }}
      />
    </div>
  );
};