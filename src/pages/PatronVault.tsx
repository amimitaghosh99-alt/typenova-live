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
  Wallet,
  QrCode,
  Share2,
  GraduationCap,
  Server,
  BookOpen,
  Code2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { DONATION_CONFIG, getDonationProgressPercent, type CryptoWallet } from '@/data/donation';
import { getActiveTitleId, setActiveTitleId } from '@/data/titles';
import type { Theme } from '@/data/constants';

export interface PatronVaultProps {
  onBack?: () => void;
  theme: Theme;
  onTitleEquipped?: (titleId: string) => void;
}

type PaymentTab = 'upi' | 'global' | 'crypto';

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
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((svg) => {
        if (active) setQrSvg(svg);
      })
      .catch((err) => {
        console.error('Failed to generate offline QR SVG:', err);
      });
    return () => {
      active = false;
    };
  }, [upiDeepLink]);

  // Keyboard shortcut: Escape to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onBack) {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  // Copy helper with feedback
  const handleCopy = useCallback((text: string, key: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(`${label} copied to clipboard!`, {
        description: text,
      });
      setTimeout(() => setCopiedKey(null), 2500);
    }
  }, []);

  // Share page link
  const handleShare = useCallback(() => {
    const url = window.location.origin + '/donate';
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedKey('share');
      toast.success('Page link copied!', {
        description: url,
      });
      setTimeout(() => setCopiedKey(null), 2500);
    }
  }, []);

  // Equip Cyber Patron title
  const handleEquipPatronTitle = useCallback(() => {
    setActiveTitleId('cyber_patron');
    setIsPatronTitleEquipped(true);
    onTitleEquipped?.('cyber_patron');
    toast.success('Holographic "Cyber Patron" Title Equipped!', {
      description: 'Your badge now radiates in your dossier, leaderboards, and lobbies.',
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
      tag: '0% Fee',
      tagColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      description: 'Credit/debit card, Apple Pay, Google Pay, or PayPal.',
    },
    {
      name: 'Buy Me a Coffee',
      url: DONATION_CONFIG.buyMeACoffeeUrl,
      icon: <Heart size={18} />,
      tag: 'Instant',
      tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      description: 'Quick 1-click checkout on mobile or desktop.',
    },
    {
      name: 'PayPal.me',
      url: DONATION_CONFIG.paypalUrl,
      icon: <Globe size={18} />,
      tag: 'Global',
      tagColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      description: 'Direct transfers in 200+ countries and local currencies.',
    },
    {
      name: 'GitHub Sponsors',
      url: DONATION_CONFIG.githubSponsorsUrl,
      icon: <Zap size={18} />,
      tag: 'Official',
      tagColor: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
      description: 'Back open source developers with official receipts.',
    },
  ];

  return (
    <div className="fixed inset-0 top-[var(--nav-h)] z-[var(--z-content)] overflow-y-auto bg-[#07080b] text-white selection:bg-white/20 custom-scrollbar">
      {/* Ambient background atmosphere tied to dynamic theme */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] rounded-full blur-[170px] opacity-20 transition-all duration-700 pointer-events-none"
          style={{ backgroundColor: `rgb(${theme.glowPrimary})` }}
        />
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* Main Content Container - auto fills monitor with responsive edge padding */}
      <div className="relative z-10 w-full px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 py-6 sm:py-8 space-y-6">

        {/* ═══ TOP STATUS & ACTION RIBBON ═══ */}
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <button
            onClick={onBack}
            className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>RETURN</span>
            <span className="text-[10px] text-zinc-600 hidden sm:inline">[ESC]</span>
          </button>

          {/* Minimalist Center Pill Group */}
          <div className="hidden md:flex items-center gap-2.5 px-3.5 py-1 rounded-full text-xs font-mono bg-white/[0.03] border border-white/[0.08] text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: `rgb(${theme.glowPrimary})` }} />
            <span className="text-zinc-300 font-semibold">Student Open Source Project</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>100% Free &amp; Ad-Free</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Zero Tracking</span>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
            title="Share page URL"
          >
            {copiedKey === 'share' ? <Check size={13} className="text-emerald-400" /> : <Share2 size={13} />}
            <span>{copiedKey === 'share' ? 'COPIED' : 'SHARE'}</span>
          </button>
        </div>

        {/* ═══ COMPACT HERO HEADER ═══ */}
        <div className="space-y-2.5 max-w-5xl">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-mono font-medium bg-white/[0.03] border border-white/10 text-zinc-300">
            <GraduationCap size={13} style={{ color: `rgb(${theme.glowPrimary})` }} />
            <span className="tracking-wider uppercase text-[11px]">STUDENT TUITION &amp; CLOUD SUSTENANCE FUND</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white font-display leading-tight">
            Support TypeNova &amp;{' '}
            <span style={{ color: `rgb(${theme.glowPrimary})` }}>
              Help Pay My College Fees.
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans max-w-4xl">
            TypeNova is built entirely by me between college classes. If it has been useful to you,
            consider making a donation. It helps pay for the domain &amp; cloud server renewals,
            keeps the platform 100% free and ad-free, and directly helps me pay down my semester college tuition fees :)
          </p>
        </div>

        {/* ═══ MAIN 2-COLUMN COCKPIT (7 COLS GOAL & PERKS / 5 COLS PAYMENT STATION) ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">

          {/* ── LEFT COLUMN (7 COLS): GOAL TRACKER, MILESTONES & PERKS ── */}
          <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-7 space-y-5">

            {/* Goal Progress Card */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <GraduationCap size={18} style={{ color: `rgb(${theme.glowPrimary})` }} />
                    <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      {goal.label}
                    </h2>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Target: $2,000 USD (~₹2,00,000 INR) for tuition &amp; annual server renewals
                  </p>
                </div>

                <div className="flex items-baseline gap-2 font-mono shrink-0">
                  <span className="text-2xl font-black text-white">
                    {goal.currency}{goal.currentAmount}
                  </span>
                  <span className="text-xs text-zinc-500">
                    / {goal.currency}{goal.targetAmount}
                  </span>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full border ml-1"
                    style={{
                      backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                      borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                      color: `rgb(${theme.glowPrimary})`,
                    }}
                  >
                    {progressPercent}% FUNDED
                  </span>
                </div>
              </div>

              {/* Glowing Progress Bar */}
              <div className="relative w-full h-2.5 bg-white/[0.06] rounded-full overflow-hidden p-0.5 border border-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(progressPercent, 0.5)}%` }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full relative"
                  style={{
                    backgroundColor: `rgb(${theme.glowPrimary})`,
                    boxShadow: `0 0 16px rgba(${theme.glowPrimary}, 0.5)`,
                  }}
                >
                  {progressPercent > 0 && (
                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full shadow-[0_0_8px_#ffffff]" />
                  )}
                </motion.div>
              </div>

              {/* 4 Milestones Rack (4 columns on xl+ to span full card width) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-1">
                {goal.milestones.map((m, idx) => {
                  const isReached = goal.currentAmount >= m.amount;
                  return (
                    <div
                      key={m.amount}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                        isReached
                          ? 'bg-white/[0.06] border-white/20 text-white'
                          : 'bg-white/[0.02] border-white/[0.06] text-zinc-400'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={
                              isReached
                                ? {
                                    backgroundColor: `rgba(${theme.glowPrimary}, 0.2)`,
                                    color: `rgb(${theme.glowPrimary})`,
                                  }
                                : {
                                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                    color: '#71717a',
                                  }
                            }
                          >
                            {getMilestoneIcon(idx)}
                          </div>
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-zinc-300">
                            ${m.amount}
                          </span>
                        </div>
                        <div className="font-bold text-xs text-white truncate">
                          {m.label}
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Supporter Recognition Card (Holographic Cyber Patron Title) */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center border"
                    style={{
                      backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                      borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                      color: `rgb(${theme.glowPrimary})`,
                    }}
                  >
                    <Award size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white font-display">
                      Supporter Perk: "Cyber Patron" Title
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Radiates beside your name in leaderboards, dossiers, and lobbies
                    </p>
                  </div>
                </div>

                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border shrink-0"
                  style={{
                    backgroundColor: `rgba(${theme.glowPrimary}, 0.1)`,
                    borderColor: `rgba(${theme.glowPrimary}, 0.3)`,
                    color: `rgb(${theme.glowPrimary})`,
                  }}
                >
                  PERMANENT
                </span>
              </div>

              {/* Live Preview Bar with Equip Action */}
              <div className="p-3.5 rounded-2xl bg-black/50 border border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold font-mono text-white">
                    TN
                  </div>
                  <span className="text-xs font-mono font-bold text-white">
                    OPERATOR
                  </span>
                  <span
                    className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border flex items-center gap-1.5"
                    style={{
                      backgroundColor: `rgba(${theme.glowPrimary}, 0.18)`,
                      borderColor: `rgba(${theme.glowPrimary}, 0.45)`,
                      color: `rgb(${theme.glowPrimary})`,
                      boxShadow: `0 0 14px rgba(${theme.glowPrimary}, 0.3)`,
                    }}
                  >
                    <Sparkles size={11} />
                    <span>CYBER PATRON</span>
                  </span>
                </div>

                <button
                  onClick={handleEquipPatronTitle}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border shrink-0"
                  style={
                    isPatronTitleEquipped
                      ? {
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          borderColor: 'rgba(16, 185, 129, 0.4)',
                          color: '#34d399',
                        }
                      : {
                          backgroundColor: `rgb(${theme.glowPrimary})`,
                          color: '#000000',
                          borderColor: `rgb(${theme.glowPrimary})`,
                          boxShadow: `0 0 16px rgba(${theme.glowPrimary}, 0.35)`,
                        }
                  }
                >
                  {isPatronTitleEquipped ? (
                    <>
                      <Check size={13} />
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

            {/* Trust & Transparency Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2 text-zinc-400">
                <Code2 size={15} className="text-emerald-400 shrink-0" />
                <span>100% MIT Open Source</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2 text-zinc-400">
                <ShieldCheck size={15} className="text-emerald-400 shrink-0" />
                <span>Zero Ads · Zero Tracking</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2 text-zinc-400">
                <GraduationCap size={15} style={{ color: `rgb(${theme.glowPrimary})` }} className="shrink-0" />
                <span>Solo Student Maintained</span>
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN (5 COLS): INTERACTIVE PAYMENT STATION ── */}
          <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-5 space-y-3">

            {/* Segmented Payment Tabs bound to dynamic theme */}
            <div className="p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-1 font-mono text-xs">
              <button
                onClick={() => setActiveTab('upi')}
                style={
                  activeTab === 'upi'
                    ? {
                        backgroundColor: `rgba(${theme.glowPrimary}, 0.2)`,
                        borderColor: `rgba(${theme.glowPrimary}, 0.5)`,
                        color: `rgb(${theme.glowPrimary})`,
                        boxShadow: `0 0 15px rgba(${theme.glowPrimary}, 0.25)`,
                      }
                    : undefined
                }
                className={`flex-1 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-transparent ${
                  activeTab === 'upi' ? 'font-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <QrCode size={14} />
                <span>UPI (India)</span>
              </button>

              <button
                onClick={() => setActiveTab('global')}
                style={
                  activeTab === 'global'
                    ? {
                        backgroundColor: `rgba(${theme.glowPrimary}, 0.2)`,
                        borderColor: `rgba(${theme.glowPrimary}, 0.5)`,
                        color: `rgb(${theme.glowPrimary})`,
                        boxShadow: `0 0 15px rgba(${theme.glowPrimary}, 0.25)`,
                      }
                    : undefined
                }
                className={`flex-1 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-transparent ${
                  activeTab === 'global' ? 'font-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Coffee size={14} />
                <span>Card / Global</span>
              </button>

              <button
                onClick={() => setActiveTab('crypto')}
                style={
                  activeTab === 'crypto'
                    ? {
                        backgroundColor: `rgba(${theme.glowPrimary}, 0.2)`,
                        borderColor: `rgba(${theme.glowPrimary}, 0.5)`,
                        color: `rgb(${theme.glowPrimary})`,
                        boxShadow: `0 0 15px rgba(${theme.glowPrimary}, 0.25)`,
                      }
                    : undefined
                }
                className={`flex-1 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-transparent ${
                  activeTab === 'crypto' ? 'font-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Wallet size={14} />
                <span>Crypto</span>
              </button>
            </div>

            {/* Active Payment Method Body */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] space-y-4">
              <AnimatePresence mode="wait">

                {/* ── TAB 1: UPI SUB-CONTINENT GATEWAY ── */}
                {activeTab === 'upi' && (
                  <motion.div
                    key="upi"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-white">
                            Instant UPI Gateway
                          </h3>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            0% Fee
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          100% directly supports my college fund. Works across India &amp; Nepal.
                        </p>
                      </div>
                    </div>

                    {/* INR Amount Quick Selectors */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10.5px] font-mono text-zinc-400 uppercase tracking-wider block">
                          Select Amount:
                        </label>
                        <span className="text-[11px] font-mono font-bold text-white">
                          ₹{activeInrAmount}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
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
                                      backgroundColor: `rgb(${theme.glowPrimary})`,
                                      color: '#000000',
                                      borderColor: `rgb(${theme.glowPrimary})`,
                                    }
                                  : undefined
                              }
                              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer border ${
                                isSelected
                                  ? 'font-black'
                                  : 'bg-white/[0.04] border-white/10 text-zinc-300 hover:border-white/30 hover:text-white'
                              }`}
                            >
                              ₹{amt}
                            </button>
                          );
                        })}

                        <button
                          onClick={() => setIsCustomMode(true)}
                          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer border ${
                            isCustomMode
                              ? 'bg-white text-black border-white'
                              : 'bg-white/[0.04] border-white/10 text-zinc-300 hover:border-white/30 hover:text-white'
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
                            placeholder="Enter any amount"
                            value={customInr}
                            onChange={(e) => setCustomInr(e.target.value)}
                            className="w-full pl-8 pr-4 py-2 bg-white/[0.05] border border-white/20 rounded-xl font-mono text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/50"
                          />
                        </div>
                      )}
                    </div>

                    {/* QR Code & Mobile Deep Link Block */}
                    <div className="p-3.5 rounded-2xl bg-black/50 border border-white/[0.06] flex flex-col sm:flex-row items-center gap-4">
                      {/* Offline Rendered SVG QR Canvas */}
                      <div className="shrink-0 p-2.5 rounded-xl bg-white flex flex-col items-center">
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
                        <span className="text-[10px] font-mono font-bold text-zinc-800 mt-1">
                          Scan to Pay ₹{activeInrAmount}
                        </span>
                      </div>

                      {/* UPI ID & Actions */}
                      <div className="space-y-2.5 flex-1 min-w-0 text-center sm:text-left">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                            VPA / UPI ID
                          </span>
                          <div className="font-mono text-sm font-bold text-white truncate">
                            {DONATION_CONFIG.upi.upiId}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                          <button
                            onClick={() => handleCopy(DONATION_CONFIG.upi.upiId, 'upiId', 'UPI ID')}
                            className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            {copiedKey === 'upiId' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            <span>{copiedKey === 'upiId' ? 'COPIED' : 'COPY'}</span>
                          </button>

                          <a
                            href={upiDeepLink}
                            className="px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 border"
                            style={{
                              backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                              borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                              color: `rgb(${theme.glowPrimary})`,
                            }}
                          >
                            <span>PAY VIA APP</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="text-[10.5px] font-mono text-zinc-500 text-center">
                      Google Pay · PhonePe · Paytm · BHIM · Cred · Fonepay
                    </div>
                  </motion.div>
                )}

                {/* ── TAB 2: GLOBAL FIAT PLATFORMS ── */}
                {activeTab === 'global' && (
                  <motion.div
                    key="global"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2.5"
                  >
                    <div className="text-xs text-zinc-400 mb-1">
                      International debit/credit cards, Apple Pay, Google Pay &amp; PayPal:
                    </div>

                    {globalPlatforms.map((p) => (
                      <a
                        key={p.name}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/20 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                            {p.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{p.name}</span>
                              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${p.tagColor}`}>
                                {p.tag}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                              {p.description}
                            </p>
                          </div>
                        </div>

                        <ExternalLink size={14} className="text-zinc-500 group-hover:text-white transition-colors shrink-0" />
                      </a>
                    ))}
                  </motion.div>
                )}

                {/* ── TAB 3: CRYPTO WALLETS ── */}
                {activeTab === 'crypto' && (
                  <motion.div
                    key="crypto"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <div className="text-xs text-zinc-400 mb-1">
                      Direct on-chain wallet transfers:
                    </div>

                    {DONATION_CONFIG.crypto.map((wallet: CryptoWallet) => (
                      <div
                        key={wallet.symbol}
                        className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${wallet.badgeColor}`}>
                              {wallet.symbol}
                            </span>
                            <span className="text-xs font-bold text-white">{wallet.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {wallet.network}
                          </span>
                        </div>

                        <div className="font-mono text-[11px] text-zinc-300 bg-black/50 px-3 py-2 rounded-xl border border-white/5 break-all select-all leading-relaxed">
                          {wallet.address}
                        </div>

                        <button
                          onClick={() => handleCopy(wallet.address, wallet.symbol, `${wallet.name} Address`)}
                          className="w-full py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {copiedKey === wallet.symbol ? (
                            <Check size={12} className="text-emerald-400" />
                          ) : (
                            <Copy size={12} />
                          )}
                          <span>{copiedKey === wallet.symbol ? 'COPIED' : `COPY ${wallet.symbol} ADDRESS`}</span>
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

          </div>

        </div>

        {/* ═══ MINIMALIST FOOTER ═══ */}
        <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 font-mono gap-3">
          <div className="flex items-center gap-2">
            <Heart size={14} className="text-rose-400 shrink-0" />
            <span>Thank you for supporting independent, ad-free typing software</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/amimitaghosh99-alt/typenova"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-300 transition-colors flex items-center gap-1"
            >
              <span>GitHub</span>
              <ExternalLink size={12} />
            </a>
            <span>•</span>
            <span>v2.9.0</span>
          </div>
        </div>

      </div>
    </div>
  );
};
