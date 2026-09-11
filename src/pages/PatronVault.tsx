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
  ChevronRight,
  MessageSquareHeart,
} from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import {
  DONATION_CONFIG,
  getDonationProgressPercent,
  getFeaturedPatrons,
  type PatronEntry,
} from '@/data/donation';
import { getActiveTitleId, setActiveTitleId } from '@/data/titles';
import type { Theme } from '@/data/constants';

export interface PatronVaultProps {
  onBack?: () => void;
  theme: Theme;
  onTitleEquipped?: (titleId: string) => void;
}

type PaymentTab = 'upi' | 'global';

export const PatronVault: React.FC<PatronVaultProps> = ({
  onBack,
  theme,
  onTitleEquipped,
}) => {
  const [activeTab, setActiveTab] = useState<PaymentTab>('upi');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedInr, setSelectedInr] = useState<number>(250);
  const [customInr, setCustomInr] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [isPatronTitleEquipped, setIsPatronTitleEquipped] = useState<boolean>(() => {
    return getActiveTitleId() === 'cyber_patron';
  });

  const progressPercent = getDonationProgressPercent(DONATION_CONFIG);
  const goal = DONATION_CONFIG.goal;
  const gp = theme.glowPrimary; // shorthand for RGB triplet string (e.g. '245, 158, 11')
  const featuredPatrons = useMemo(() => getFeaturedPatrons(DONATION_CONFIG), []);

  // Active amount for UPI link generation
  const activeInrAmount = isCustomMode ? (Number(customInr) || 250) : selectedInr;

  // Dynamic UPI payment URL for QR & mobile deep link
  const upiDeepLink = useMemo(() => {
    const vpa = DONATION_CONFIG.upi.upiId;
    const name = encodeURIComponent(DONATION_CONFIG.upi.payeeName);
    const note = encodeURIComponent(DONATION_CONFIG.upi.defaultNote);
    return `upi://pay?pa=${vpa}&pn=${name}&am=${activeInrAmount}&cu=INR&tn=${note}`;
  }, [activeInrAmount]);

  // Dynamic QR Code SVG generated offline locally
  const [qrSvg, setQrSvg] = useState<string>('');

  useEffect(() => {
    let active = true;
    QRCode.toString(upiDeepLink, {
      type: 'svg',
      margin: 1,
      color: { dark: '#050608', light: '#ffffff' },
    })
      .then((svg) => {
        if (active) setQrSvg(svg);
      })
      .catch((err) => {
        console.error('QR generation failed:', err);
      });
    return () => {
      active = false;
    };
  }, [upiDeepLink]);

  // Keyboard shortcut: Escape to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onBack) onBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  // Copy helper with feedback
  const handleCopy = useCallback((text: string, key: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(`${label} copied to clipboard!`, { description: text });
      setTimeout(() => setCopiedKey(null), 2500);
    }
  }, []);

  // Share page link
  const handleShare = useCallback(() => {
    const url = window.location.origin + '/donate';
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedKey('share');
      toast.success('Page link copied!', { description: url });
      setTimeout(() => setCopiedKey(null), 2500);
    }
  }, []);

  // Equip Cyber Patron title
  const handleEquipPatronTitle = useCallback(() => {
    setActiveTitleId('cyber_patron');
    setIsPatronTitleEquipped(true);
    onTitleEquipped?.('cyber_patron');
    toast.success('Holographic "Cyber Patron" Title Equipped!', {
      description: 'Radiating in your dossier, leaderboards, and lobbies.',
    });
  }, [onTitleEquipped]);

  // Milestone icon mapping
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
      className="fixed inset-0 top-[var(--nav-h)] z-[var(--z-content)] overflow-y-auto text-zinc-100 selection:bg-white/20 custom-scrollbar"
      style={{ backgroundColor: '#07090e' }}
    >
      {/* ═══ CALIBRATED ATMOSPHERIC STAGE ═══ */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Primary dynamic accent radial - soft top bloom */}
        <div
          className="absolute -top-48 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full blur-[160px] opacity-[0.22] transition-colors duration-700 pointer-events-none"
          style={{ backgroundColor: `rgb(${gp})` }}
        />
        {/* Subtle geometric dot matrix */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Top edge shadow gradient */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
      </div>

      {/* ═══ ROOT WIDESCREEN CONTAINER (FILLS MONITOR) ═══ */}
      <div className="relative z-10 w-full px-5 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 py-6 sm:py-8 space-y-8 max-w-[1920px] mx-auto">

        {/* ── 1. STAGE BAR / COMMAND STRIP ── */}
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
          <button
            onClick={onBack}
            className="group flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer"
          >
            <ArrowLeft size={13} className="group-hover:-translate-x-1 transition-transform" />
            <span>RETURN</span>
            <span className="text-[10px] text-zinc-600 hidden sm:inline ml-0.5">[ESC]</span>
          </button>

          {/* Minimalist Center Pill Group */}
          <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-full text-xs font-mono bg-[#0e1219]/80 border border-white/[0.08] text-zinc-400 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: `rgb(${gp})` }} />
            <span className="text-zinc-200 font-semibold">Independent Academic Project</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>100% Free &amp; Ad-Free</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Zero Tracking</span>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer"
            title="Share page URL"
          >
            {copiedKey === 'share' ? <Check size={13} className="text-emerald-400" /> : <Share2 size={13} />}
            <span>{copiedKey === 'share' ? 'COPIED' : 'SHARE'}</span>
          </button>
        </div>

        {/* ── 2. EDITORIAL HERO & MISSION ── */}
        <div className="space-y-4 max-w-5xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-semibold tracking-wider uppercase bg-white/[0.03] border border-white/[0.08] text-zinc-300">
            <GraduationCap size={13} style={{ color: `rgb(${gp})` }} />
            <span>STUDENT TUITION &amp; CLOUD SUSTENANCE FUND</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white font-display leading-[1.15] text-balance">
            Support TypeNova &amp;{' '}
            <span
              className="inline-block"
              style={{
                color: `rgb(${gp})`,
                textShadow: `0 0 35px rgba(${gp}, 0.35)`,
              }}
            >
              Help Pay My College Fees.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-sans max-w-4xl">
            TypeNova is built entirely by an undergraduate student between classes, labs, and late nights.
            There are no venture capitalists, no paywalled statistics, and zero tracking ads.
            Every rupee and dollar contributed directly pays down semester tuition fees and funds
            the annual cloud servers keeping TypeNova online, fast, and free for all typists worldwide.
          </p>
        </div>

        {/* ── 3. PRECISION IMPACT METRICS ROW ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: 'TESTS HOSTED GLOBALLY',
              value: '128,000+',
              sub: 'Fast, ad-free typing sessions',
            },
            {
              label: 'SEMESTER TUITION GOAL',
              value: `$${goal.currentAmount} / $${goal.targetAmount}`,
              sub: `${progressPercent}% funded towards target`,
              highlight: true,
            },
            {
              label: 'SOURCE CODE',
              value: '100% MIT',
              sub: 'Publicly inspectable on GitHub',
            },
            {
              label: 'TRACKING & TELEMETRY',
              value: '0.00%',
              sub: 'Completely private by architecture',
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-[#0b0e15]/80 border border-white/[0.07] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400 block mb-1">
                {stat.label}
              </span>
              <div
                className="text-xl sm:text-2xl font-black font-mono tracking-tight"
                style={stat.highlight ? { color: `rgb(${gp})` } : { color: '#ffffff' }}
              >
                {stat.value}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 font-mono">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* ═══ 4. ASYMMETRIC DUAL COCKPIT (7 COLS LEDGER / 5 COLS TERMINAL) ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">

          {/* ── LEFT COLUMN (7 COLS): SUSTENANCE ROADMAP & COMMUNITY PROOF ── */}
          <div className="lg:col-span-7 space-y-6">

            {/* A. SUSTENANCE MILESTONE ROADMAP (Doppelrand Shell + Inner Core) */}
            <div className="rounded-[1.75rem] p-1 bg-white/[0.02] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="p-5 sm:p-7 rounded-[calc(1.75rem-0.25rem)] bg-[#0c0f16]/90 backdrop-blur-2xl border border-white/[0.05] space-y-6">

                {/* Header with Title & Goal Figures */}
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <GraduationCap size={18} style={{ color: `rgb(${gp})` }} />
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        {goal.label}
                      </h2>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                      Target: $2,000 USD (~₹2,00,000 INR) for semester tuition &amp; infrastructure
                    </p>
                  </div>

                  <div className="flex items-baseline gap-2 font-mono shrink-0">
                    <span className="text-3xl font-black text-white">
                      {goal.currency}{goal.currentAmount}
                    </span>
                    <span className="text-xs text-zinc-400">
                      / {goal.currency}{goal.targetAmount}
                    </span>
                    <span
                      className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border ml-1 font-mono"
                      style={{
                        backgroundColor: `rgba(${gp}, 0.12)`,
                        borderColor: `rgba(${gp}, 0.35)`,
                        color: `rgb(${gp})`,
                      }}
                    >
                      {progressPercent}% FUNDED
                    </span>
                  </div>
                </div>

                {/* Glowing Hardware Progress Track */}
                <div className="space-y-2">
                  <div className="relative w-full h-3 bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/[0.08]">
                    <div
                      className="h-full rounded-full transition-all duration-1000 relative"
                      style={{
                        width: `${Math.max(progressPercent, 1)}%`,
                        backgroundColor: `rgb(${gp})`,
                        boxShadow: `0 0 16px rgba(${gp}, 0.6), 0 0 32px rgba(${gp}, 0.25)`,
                      }}
                    >
                      {progressPercent > 0 && (
                        <div className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full shadow-[0_0_8px_#ffffff]" />
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                    <span>$0 (Genesis)</span>
                    <span style={{ color: `rgb(${gp})` }}>Phase Roadmap Active</span>
                    <span>$2,000 (Tuition Cap)</span>
                  </div>
                </div>

                {/* 4 Connected Ledger Milestones */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-1">
                  {goal.milestones.map((m, idx) => {
                    const isReached = goal.currentAmount >= m.amount;
                    return (
                      <div
                        key={m.amount}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between relative ${
                          isReached
                            ? 'bg-white/[0.06] border-white/20 text-white'
                            : 'bg-[#090b10]/90 border-white/[0.06] text-zinc-400'
                        }`}
                        style={
                          isReached
                            ? {
                                borderColor: `rgba(${gp}, 0.4)`,
                                boxShadow: `0 0 20px rgba(${gp}, 0.12)`,
                              }
                            : undefined
                        }
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2.5">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={
                                isReached
                                  ? {
                                      backgroundColor: `rgba(${gp}, 0.2)`,
                                      color: `rgb(${gp})`,
                                    }
                                  : {
                                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                      color: '#a1a1aa',
                                    }
                              }
                            >
                              {getMilestoneIcon(idx)}
                            </div>
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-zinc-200">
                              ${m.amount}
                            </span>
                          </div>
                          <div className="font-bold text-xs text-white leading-snug">
                            {m.label}
                          </div>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                          {m.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>

            {/* B. EXCLUSIVE SUPPORTER REWARD: "CYBER PATRON" TITLE */}
            <div className="rounded-[1.75rem] p-1 bg-white/[0.02] border border-white/[0.08]">
              <div className="p-5 sm:p-6 rounded-[calc(1.75rem-0.25rem)] bg-[#0c0f16]/90 backdrop-blur-2xl border border-white/[0.05] space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0"
                      style={{
                        backgroundColor: `rgba(${gp}, 0.15)`,
                        borderColor: `rgba(${gp}, 0.35)`,
                        color: `rgb(${gp})`,
                      }}
                    >
                      <Award size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white font-display">
                        Supporter Perk: "Cyber Patron" Holographic Title
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Radiates beside your name in leaderboards, operator dossiers, and race lobbies.
                      </p>
                    </div>
                  </div>

                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border shrink-0"
                    style={{
                      backgroundColor: `rgba(${gp}, 0.1)`,
                      borderColor: `rgba(${gp}, 0.3)`,
                      color: `rgb(${gp})`,
                    }}
                  >
                    PERMANENT
                  </span>
                </div>

                {/* Holographic Badge Preview & One-Click Equip Button */}
                <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold font-mono text-white border border-white/10">
                      TN
                    </div>
                    <span className="text-xs font-mono font-bold text-white">OPERATOR</span>
                    <span
                      className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border flex items-center gap-1.5"
                      style={{
                        backgroundColor: `rgba(${gp}, 0.18)`,
                        borderColor: `rgba(${gp}, 0.5)`,
                        color: `rgb(${gp})`,
                        boxShadow: `0 0 16px rgba(${gp}, 0.35)`,
                      }}
                    >
                      <Sparkles size={11} />
                      <span>CYBER PATRON</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline">
                      LVL 50+
                    </span>
                  </div>

                  <button
                    onClick={handleEquipPatronTitle}
                    className="w-full sm:w-auto px-5 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border shrink-0"
                    style={
                      isPatronTitleEquipped
                        ? {
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            borderColor: 'rgba(16, 185, 129, 0.4)',
                            color: '#34d399',
                          }
                        : {
                            backgroundColor: `rgb(${gp})`,
                            color: '#000000',
                            borderColor: `rgb(${gp})`,
                            boxShadow: `0 0 20px rgba(${gp}, 0.4)`,
                          }
                    }
                  >
                    {isPatronTitleEquipped ? (
                      <>
                        <Check size={13} strokeWidth={2.5} />
                        <span>EQUIPPED IN DOSSIER &amp; LOBBIES ✓</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>EQUIP TITLE BADGE</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* C. COMMUNITY PATRON WALL (AUTHENTIC SOCIAL PROOF) */}
            <div className="rounded-[1.75rem] p-1 bg-white/[0.02] border border-white/[0.08]">
              <div className="p-5 sm:p-6 rounded-[calc(1.75rem-0.25rem)] bg-[#0c0f16]/90 backdrop-blur-2xl border border-white/[0.05] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MessageSquareHeart size={17} style={{ color: `rgb(${gp})` }} />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      Recent Typist Supporters
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">
                    Community Backers
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {featuredPatrons.map((patron: PatronEntry, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#090b10]/90 border border-white/[0.06] flex flex-col justify-between text-xs font-mono"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-bold text-white truncate">{patron.name}</span>
                        <span
                          className="font-bold px-2 py-0.5 rounded text-[10px] shrink-0"
                          style={{
                            backgroundColor: `rgba(${gp}, 0.12)`,
                            color: `rgb(${gp})`,
                          }}
                        >
                          ${patron.amount}
                        </span>
                      </div>
                      {patron.message ? (
                        <p className="text-[11px] text-zinc-400 italic line-clamp-2">
                          "{patron.message}"
                        </p>
                      ) : (
                        <span className="text-[10px] text-zinc-400 uppercase tracking-widest">
                          Supporter · {patron.platform}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN (5 COLS): INTERACTIVE PAYMENT TERMINAL (NO CRYPTO) ── */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">

            {/* Segmented Mode Selector (UPI vs. Global Cards) */}
            <div className="p-1 rounded-2xl bg-[#0b0e15] border border-white/10 flex items-center gap-1 font-mono text-xs shadow-xl">
              <button
                onClick={() => setActiveTab('upi')}
                style={
                  activeTab === 'upi'
                    ? {
                        backgroundColor: `rgba(${gp}, 0.18)`,
                        borderColor: `rgba(${gp}, 0.5)`,
                        color: `rgb(${gp})`,
                        boxShadow: `0 0 16px rgba(${gp}, 0.25)`,
                      }
                    : undefined
                }
                className={`flex-1 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border border-transparent ${
                  activeTab === 'upi' ? 'font-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <QrCode size={14} />
                <span>UPI (India &amp; Nepal)</span>
              </button>

              <button
                onClick={() => setActiveTab('global')}
                style={
                  activeTab === 'global'
                    ? {
                        backgroundColor: `rgba(${gp}, 0.18)`,
                        borderColor: `rgba(${gp}, 0.5)`,
                        color: `rgb(${gp})`,
                        boxShadow: `0 0 16px rgba(${gp}, 0.25)`,
                      }
                    : undefined
                }
                className={`flex-1 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border border-transparent ${
                  activeTab === 'global' ? 'font-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Globe size={14} />
                <span>Cards &amp; Global Fiat</span>
              </button>
            </div>

            {/* Main Terminal Frame */}
            <div className="rounded-[1.75rem] p-1 bg-white/[0.02] border border-white/[0.08] shadow-2xl">
              <div className="p-5 sm:p-6 rounded-[calc(1.75rem-0.25rem)] bg-[#0c0f16]/95 backdrop-blur-2xl border border-white/[0.05] space-y-5">
                <AnimatePresence mode="wait">

                  {/* ── TAB 1: INSTANT UPI GATEWAY ── */}
                  {activeTab === 'upi' && (
                    <motion.div
                      key="upi"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-5"
                    >
                      {/* Terminal Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white font-mono">
                              Instant UPI Gateway
                            </h3>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              0% Fee
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Direct student payment with instant settlement in India &amp; Nepal.
                          </p>
                        </div>
                      </div>

                      {/* Amount Quick Selectors */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <label className="text-zinc-400 uppercase tracking-wider block">
                            Select Amount:
                          </label>
                          <span
                            className="font-black text-sm"
                            style={{ color: `rgb(${gp})` }}
                          >
                            ₹{activeInrAmount}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                          {[50, 100, 250, 500, 1000].map((amt) => {
                            const isSelected = !isCustomMode && selectedInr === amt;
                            return (
                              <button
                                key={amt}
                                onClick={() => {
                                  setSelectedInr(amt);
                                  setIsCustomMode(false);
                                }}
                                style={
                                  isSelected
                                    ? {
                                        backgroundColor: `rgb(${gp})`,
                                        color: '#000000',
                                        borderColor: `rgb(${gp})`,
                                        boxShadow: `0 0 14px rgba(${gp}, 0.35)`,
                                      }
                                    : undefined
                                }
                                className={`py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer border ${
                                  isSelected
                                    ? 'font-black'
                                    : 'bg-white/[0.03] border-white/10 text-zinc-300 hover:border-white/30 hover:text-white'
                                }`}
                              >
                                ₹{amt}
                              </button>
                            );
                          })}

                          <button
                            onClick={() => setIsCustomMode(true)}
                            className={`py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer border ${
                              isCustomMode
                                ? 'bg-white text-black border-white font-black'
                                : 'bg-white/[0.03] border-white/10 text-zinc-300 hover:border-white/30 hover:text-white'
                            }`}
                          >
                            Custom
                          </button>
                        </div>

                        {isCustomMode && (
                          <div className="relative pt-1">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-zinc-400 text-xs">
                              ₹
                            </span>
                            <input
                              type="number"
                              min="10"
                              placeholder="Enter amount in INR"
                              value={customInr}
                              onChange={(e) => setCustomInr(e.target.value)}
                              className="w-full pl-8 pr-4 py-2 bg-black/60 border border-white/20 rounded-xl font-mono text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/60 transition-colors"
                            />
                          </div>
                        )}
                      </div>

                      {/* QR Code Chamber & UPI ID Details */}
                      <div
                        className="p-4 rounded-2xl border flex flex-col sm:flex-row items-center gap-4 relative overflow-hidden"
                        style={{
                          backgroundColor: '#090b10',
                          borderColor: `rgba(${gp}, 0.2)`,
                        }}
                      >
                        {/* High-Contrast Crisp QR Canvas with Scannable Reticle */}
                        <div className="shrink-0 p-2.5 rounded-xl bg-white flex flex-col items-center shadow-lg">
                          {qrSvg ? (
                            <div
                              className="w-28 h-28 [&>svg]:w-full [&>svg]:h-full"
                              dangerouslySetInnerHTML={{ __html: qrSvg }}
                            />
                          ) : (
                            <div className="w-28 h-28 flex items-center justify-center bg-zinc-100 rounded text-zinc-400">
                              <QrCode size={28} className="animate-pulse" />
                            </div>
                          )}
                          <span className="text-[10px] font-mono font-black text-zinc-900 mt-1">
                            ₹{activeInrAmount} INR
                          </span>
                        </div>

                        {/* UPI Address & Action Buttons */}
                        <div className="space-y-3 flex-1 min-w-0 text-center sm:text-left">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                              VPA / UPI ID
                            </span>
                            <div className="font-mono text-sm font-bold text-white truncate">
                              {DONATION_CONFIG.upi.upiId}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                            <button
                              onClick={() => handleCopy(DONATION_CONFIG.upi.upiId, 'upiId', 'UPI ID')}
                              className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/10 text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              {copiedKey === 'upiId' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                              <span>{copiedKey === 'upiId' ? 'COPIED' : 'COPY'}</span>
                            </button>

                            <a
                              href={upiDeepLink}
                              className="px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 border"
                              style={{
                                backgroundColor: `rgba(${gp}, 0.15)`,
                                borderColor: `rgba(${gp}, 0.4)`,
                                color: `rgb(${gp})`,
                              }}
                            >
                              <span>PAY VIA APP</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Supported Apps Monospace Bar */}
                      <div className="text-[10px] font-mono text-zinc-400 text-center flex items-center justify-center gap-1.5 flex-wrap">
                        <span>Google Pay</span>
                        <span>•</span>
                        <span>PhonePe</span>
                        <span>•</span>
                        <span>Paytm</span>
                        <span>•</span>
                        <span>BHIM</span>
                        <span>•</span>
                        <span>Cred</span>
                        <span>•</span>
                        <span>Fonepay</span>
                      </div>
                    </motion.div>
                  )}

                  {/* ── TAB 2: GLOBAL FIAT PLATFORMS ── */}
                  {activeTab === 'global' && (
                    <motion.div
                      key="global"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-3"
                    >
                      <div className="text-xs text-zinc-400 mb-2 font-mono">
                        Global credit/debit cards, Apple Pay, Google Pay &amp; PayPal:
                      </div>

                      {globalPlatforms.map((p) => (
                        <a
                          key={p.name}
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group p-3.5 rounded-2xl bg-[#090b10]/90 hover:bg-[#0f131c] border border-white/[0.07] hover:border-white/20 transition-all flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform"
                              style={{
                                backgroundColor: `rgba(${gp}, 0.12)`,
                                color: `rgb(${gp})`,
                              }}
                            >
                              {p.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">{p.name}</span>
                                <span
                                  className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border"
                                  style={{
                                    backgroundColor: `rgba(${gp}, 0.1)`,
                                    borderColor: `rgba(${gp}, 0.3)`,
                                    color: `rgb(${gp})`,
                                  }}
                                >
                                  {p.tag}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                                {p.description}
                              </p>
                            </div>
                          </div>

                          <div className="w-7 h-7 rounded-full bg-white/[0.04] group-hover:bg-white/[0.1] flex items-center justify-center shrink-0 transition-colors">
                            <ChevronRight size={14} className="text-zinc-400 group-hover:text-white transition-colors" />
                          </div>
                        </a>
                      ))}
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>

          </div>

        </div>

        {/* ── 5. TRANSPARENCY & ETHOS PILLARS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono pt-4">
          <div className="p-4 rounded-2xl bg-[#090b10]/80 border border-white/[0.07] flex items-center gap-3 text-zinc-300">
            <Code2 size={18} className="text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-white">100% MIT Open Source</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Inspect every line of code on GitHub</div>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-[#090b10]/80 border border-white/[0.07] flex items-center gap-3 text-zinc-300">
            <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-white">Zero Ads · Zero Tracking</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">No cookies, no data sales, private forever</div>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-[#090b10]/80 border border-white/[0.07] flex items-center gap-3 text-zinc-300">
            <GraduationCap size={18} style={{ color: `rgb(${gp})` }} className="shrink-0" />
            <div>
              <div className="font-bold text-white">Solo Student Maintained</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Directly sustaining an indie developer's studies</div>
            </div>
          </div>
        </div>

        {/* ── 6. MINIMALIST FOOTER ── */}
        <div className="pt-6 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 font-mono gap-3">
          <div className="flex items-center gap-2">
            <Heart size={14} className="text-rose-400 shrink-0" />
            <span>Thank you for empowering independent typing software.</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/amimitaghosh99-alt/typenova"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <span>GitHub</span>
              <ExternalLink size={12} />
            </a>
            <span>•</span>
            <span>v3.0.0</span>
          </div>
        </div>

      </div>
    </div>
  );
};