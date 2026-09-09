import React, { useState, useEffect } from 'react';
import {
  X,
  HandHeart,
  QrCode,
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { DONATION_CONFIG, getDonationProgressPercent, type CryptoWallet } from '@/data/donation';
import { setActiveTitleId } from '@/data/titles';
import type { Theme } from '@/data/constants';

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  onTitleEquipped?: (titleId: string) => void;
}

type TabType = 'upi' | 'kofi' | 'crypto' | 'perk';

export const DonateModal: React.FC<DonateModalProps> = ({
  isOpen,
  onClose,
  theme,
  onTitleEquipped,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('upi');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedInr, setSelectedInr] = useState<number>(100);
  const [titleClaimed, setTitleClaimed] = useState<boolean>(false);

  const progressPercent = getDonationProgressPercent(DONATION_CONFIG);
  const goal = DONATION_CONFIG.goal;

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const copyToClipboard = (text: string, key: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(`${label} copied to clipboard!`, {
        description: text,
      });
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const handleClaimPatronTitle = () => {
    setActiveTitleId('cyber_patron');
    setTitleClaimed(true);
    onTitleEquipped?.('cyber_patron');
    toast.success('Holographic "Cyber Patron" Title Equipped!', {
      description: 'Your profile badge now radiates with the Cyber Patron insignia.',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Liquid Glass Dark Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-2xl transition-opacity"
      />

      {/* Main Frosted Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        style={{
          boxShadow: `0 0 60px rgba(${theme.glowPrimary}, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
          borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
        }}
        className="relative w-full max-w-2xl bg-black/85 border rounded-3xl p-6 sm:p-8 backdrop-blur-3xl overflow-hidden z-10 text-left my-auto shadow-2xl"
      >
        {/* Ambient Top Glow Orbs */}
        <div
          className="absolute -top-24 -left-24 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-25"
          style={{ backgroundColor: `rgb(${theme.glowPrimary})` }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20 bg-rose-500"
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer z-20"
          title="Close (Esc)"
        >
          <X size={18} />
        </button>

        {/* Header: Title & HandHeart Emblem */}
        <div className="flex items-start gap-4 mb-6">
          <div
            className="p-3.5 rounded-2xl border flex items-center justify-center shrink-0"
            style={{
              borderColor: `rgba(${theme.glowPrimary}, 0.4)`,
              backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
              boxShadow: `0 0 24px rgba(${theme.glowPrimary}, 0.25)`,
            }}
          >
            <HandHeart size={26} style={{ color: `rgb(${theme.glowPrimary})` }} className="animate-pulse" />
          </div>

          <div className="flex-1 pr-6">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase font-display">
                Support TypeNova
              </h2>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black tracking-wider uppercase"
                style={{
                  backgroundColor: `rgba(${theme.glowPrimary}, 0.2)`,
                  color: `rgb(${theme.glowPrimary})`,
                  border: `1px solid rgba(${theme.glowPrimary}, 0.4)`,
                }}
              >
                Open Source
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
              If TypeNova has been useful to you and you're able to, consider making a donation. It helps pay for the server and domain, keeps the platform 100% free and ad-free, and directly helps me pay for my college fees :)
            </p>
          </div>
        </div>

        {/* Community Goal Progress Card ($1,000 Target) */}
        <div
          className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 mb-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
          }}
        >
          <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
            <span className="font-mono text-zinc-400 font-medium">
              Community Goal: <span className="text-white font-bold">{goal.label}</span>
            </span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-white font-black text-sm sm:text-base">
                {goal.currency}{goal.currentAmount}
              </span>
              <span className="text-zinc-500">/ {goal.currency}{goal.targetAmount}</span>
              <span
                className="ml-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'rgba(244, 63, 94, 0.2)',
                  color: '#fb7185',
                  border: '1px solid rgba(244, 63, 94, 0.35)',
                }}
              >
                {progressPercent}% FUNDED
              </span>
            </div>
          </div>

          {/* Progress Bar with Glowing Head */}
          <div className="relative w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full relative"
              style={{
                background: `linear-gradient(90deg, rgb(${theme.glowPrimary}), #f43f5e)`,
                boxShadow: '0 0 15px rgba(244, 63, 94, 0.8)',
              }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full shadow-[0_0_8px_#ffffff]" />
            </motion.div>
          </div>

          {/* Milestone markers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/5 text-[10.5px]">
            {goal.milestones.map((m) => {
              const reached = goal.currentAmount >= m.amount;
              return (
                <div key={m.amount} className="flex flex-col">
                  <div className="flex items-center gap-1">
                    {reached ? (
                      <Check size={11} className="text-emerald-400" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                    )}
                    <span className={`font-mono font-bold ${reached ? 'text-zinc-200' : 'text-zinc-500'}`}>
                      ${m.amount}
                    </span>
                  </div>
                  <span className="text-zinc-400 truncate mt-0.5" title={m.description}>
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl mb-5 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('upi')}
            style={
              activeTab === 'upi'
                ? {
                    backgroundColor: `rgba(${theme.glowPrimary}, 0.22)`,
                    color: `rgb(${theme.glowPrimary})`,
                    boxShadow: `0 0 12px rgba(${theme.glowPrimary}, 0.25)`,
                  }
                : undefined
            }
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'upi' ? 'font-black' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <QrCode size={14} />
            <span>UPI (India / Nepal)</span>
          </button>

          <button
            onClick={() => setActiveTab('kofi')}
            style={
              activeTab === 'kofi'
                ? {
                    backgroundColor: `rgba(${theme.glowPrimary}, 0.22)`,
                    color: `rgb(${theme.glowPrimary})`,
                    boxShadow: `0 0 12px rgba(${theme.glowPrimary}, 0.25)`,
                  }
                : undefined
            }
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'kofi' ? 'font-black' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Coffee size={14} />
            <span>Ko-fi & Global</span>
          </button>

          <button
            onClick={() => setActiveTab('crypto')}
            style={
              activeTab === 'crypto'
                ? {
                    backgroundColor: `rgba(${theme.glowPrimary}, 0.22)`,
                    color: `rgb(${theme.glowPrimary})`,
                    boxShadow: `0 0 12px rgba(${theme.glowPrimary}, 0.25)`,
                  }
                : undefined
            }
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'crypto' ? 'font-black' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Wallet size={14} />
            <span>Crypto (Web3)</span>
          </button>

          <button
            onClick={() => setActiveTab('perk')}
            style={
              activeTab === 'perk'
                ? {
                    backgroundColor: 'rgba(244, 63, 94, 0.22)',
                    color: '#fb7185',
                    boxShadow: '0 0 12px rgba(244, 63, 94, 0.3)',
                  }
                : undefined
            }
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'perk' ? 'font-black' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles size={14} />
            <span>Patron Perk</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <AnimatePresence mode="wait">
          {/* TAB 1: UPI for India & Nepal */}
          {activeTab === 'upi' && (
            <motion.div
              key="upi"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">UPI VPA ID</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                      Zero Fees
                    </span>
                  </div>
                  <div className="text-lg font-mono font-bold text-white tracking-wide">
                    {DONATION_CONFIG.upi.upiId}
                  </div>
                  <p className="text-xs text-zinc-400">
                    Works across Google Pay, PhonePe, Paytm, BHIM, Cred, and cross-border UPI QR (Nepal).
                  </p>
                </div>

                <button
                  onClick={() => copyToClipboard(DONATION_CONFIG.upi.upiId, 'upiId', 'UPI ID')}
                  style={{
                    backgroundColor: `rgba(${theme.glowPrimary}, 0.18)`,
                    color: `rgb(${theme.glowPrimary})`,
                    borderColor: `rgba(${theme.glowPrimary}, 0.5)`,
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg"
                >
                  {copiedKey === 'upiId' ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copiedKey === 'upiId' ? 'COPIED!' : 'COPY UPI ID'}</span>
                </button>
              </div>

              {/* Quick Amount Suggestion Buttons */}
              <div>
                <div className="text-[11px] font-mono text-zinc-400 mb-2 uppercase tracking-wider">
                  Quick Amount Suggestion:
                </div>
                <div className="flex flex-wrap gap-2">
                  {DONATION_CONFIG.upi.suggestedAmountsInr.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setSelectedInr(amt)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                        selectedInr === amt
                          ? 'bg-white text-black border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                          : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-xs flex items-center gap-2">
                <ShieldCheck size={16} className="text-amber-400 shrink-0" />
                <span>
                  Tip: Open your preferred UPI app, choose "Pay to UPI ID / VPA", enter <span className="font-mono font-bold text-amber-100">{DONATION_CONFIG.upi.upiId}</span>, and submit any amount you wish!
                </span>
              </div>
            </motion.div>
          )}

          {/* TAB 2: Ko-fi, Buy Me A Coffee & PayPal */}
          {activeTab === 'kofi' && (
            <motion.div
              key="kofi"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              {/* Ko-fi Card */}
              <a
                href={DONATION_CONFIG.kofiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-4 rounded-2xl bg-gradient-to-br from-[#13C3FF]/15 to-transparent border border-[#13C3FF]/30 hover:border-[#13C3FF]/60 hover:shadow-[0_0_20px_rgba(19,195,255,0.25)] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#13C3FF]/20 flex items-center justify-center text-[#13C3FF]">
                        <Coffee size={16} />
                      </div>
                      <span className="font-bold text-white text-sm">Ko-fi</span>
                    </div>
                    <ExternalLink size={14} className="text-zinc-400 group-hover:text-white transition-colors" />
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Tip or buy a monthly coffee on Ko-fi. Supports international debit/credit cards and PayPal with 0% platform cuts.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono font-bold text-[#13C3FF]">
                  <span>ko-fi.com/typenova</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
              </a>

              {/* Buy Me a Coffee Card */}
              <a
                href={DONATION_CONFIG.buyMeACoffeeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-4 rounded-2xl bg-gradient-to-br from-[#FFDD00]/15 to-transparent border border-[#FFDD00]/30 hover:border-[#FFDD00]/60 hover:shadow-[0_0_20px_rgba(255,221,0,0.25)] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#FFDD00]/20 flex items-center justify-center text-[#FFDD00]">
                        <Heart size={16} />
                      </div>
                      <span className="font-bold text-white text-sm">Buy Me a Coffee</span>
                    </div>
                    <ExternalLink size={14} className="text-zinc-400 group-hover:text-white transition-colors" />
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Single-click support via Apple Pay, Google Pay, or Credit Card.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono font-bold text-[#FFDD00]">
                  <span>buymeacoffee.com</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
              </a>

              {/* PayPal Card */}
              <a
                href={DONATION_CONFIG.paypalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-4 rounded-2xl bg-gradient-to-br from-[#00457C]/20 to-transparent border border-[#0079C1]/30 hover:border-[#0079C1]/60 hover:shadow-[0_0_20px_rgba(0,121,193,0.25)] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#0079C1]/20 flex items-center justify-center text-[#0079C1]">
                        <Globe size={16} />
                      </div>
                      <span className="font-bold text-white text-sm">PayPal.me</span>
                    </div>
                    <ExternalLink size={14} className="text-zinc-400 group-hover:text-white transition-colors" />
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Direct global payment via PayPal balance or linked bank.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono font-bold text-sky-400">
                  <span>paypal.me/typenova</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
              </a>

              {/* GitHub Sponsors Card */}
              <a
                href={DONATION_CONFIG.githubSponsorsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-4 rounded-2xl bg-gradient-to-br from-[#ea4aaa]/15 to-transparent border border-[#ea4aaa]/30 hover:border-[#ea4aaa]/60 hover:shadow-[0_0_20px_rgba(234,74,170,0.25)] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#ea4aaa]/20 flex items-center justify-center text-[#ea4aaa]">
                        <Zap size={16} />
                      </div>
                      <span className="font-bold text-white text-sm">GitHub Sponsors</span>
                    </div>
                    <ExternalLink size={14} className="text-zinc-400 group-hover:text-white transition-colors" />
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Sponsor through GitHub. Clean invoices for developers and organizations.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono font-bold text-pink-400">
                  <span>github.com/sponsors</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
              </a>
            </motion.div>
          )}

          {/* TAB 3: Crypto & Web3 */}
          {activeTab === 'crypto' && (
            <motion.div
              key="crypto"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {DONATION_CONFIG.crypto.map((wallet: CryptoWallet) => (
                <div
                  key={wallet.symbol}
                  className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${wallet.badgeColor}`}>
                        {wallet.symbol}
                      </span>
                      <span className="text-xs font-bold text-white">{wallet.name}</span>
                      <span className="text-[10px] text-zinc-400 hidden sm:inline">({wallet.network})</span>
                    </div>
                    <div className="font-mono text-xs text-zinc-300 truncate max-w-[280px] sm:max-w-md">
                      {wallet.address}
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard(wallet.address, wallet.symbol, `${wallet.name} Address`)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer shrink-0"
                    title={`Copy ${wallet.name} address`}
                  >
                    {copiedKey === wallet.symbol ? (
                      <Check size={15} className="text-emerald-400" />
                    ) : (
                      <Copy size={15} />
                    )}
                  </button>
                </div>
              ))}
              <p className="text-[11px] text-zinc-500 text-center font-mono">
                Supports BTC, ERC-20 / Arbitrum USDT, and Solana SPL transfers.
              </p>
            </motion.div>
          )}

          {/* TAB 4: Supporter Perk (Claim Cyber Patron Title) */}
          {activeTab === 'perk' && (
            <motion.div
              key="perk"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="p-5 rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-purple-500/5 to-transparent space-y-4"
              style={{
                boxShadow: '0 0 30px rgba(244, 63, 94, 0.15)',
              }}
            >
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
                  <Award size={22} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase font-display flex items-center gap-2">
                    <span>Exclusive Perk: Cyber Patron Title</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                      ELITE
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    To honor typists who support TypeNova's open development and servers, equip this exclusive holographic insignia in your Operator Dossier and match lobbies.
                  </p>
                </div>
              </div>

              {/* Preview Badge */}
              <div className="flex items-center justify-center p-3 rounded-xl bg-black/50 border border-white/10">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-rose-300 border border-rose-500/50 bg-rose-500/15 shadow-[0_0_20px_rgba(244,63,94,0.4)]">
                  <HandHeart size={14} className="text-rose-400" />
                  <span>Cyber Patron</span>
                </div>
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  onClick={handleClaimPatronTitle}
                  className="px-6 py-2.5 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-xl hover:scale-105 active:scale-95 bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white hover:from-rose-400 hover:to-fuchsia-500"
                >
                  <Sparkles size={14} />
                  <span>{titleClaimed ? 'EQUIPPED IN DOSSIER ✓' : 'CLAIM & EQUIP TITLE'}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Guarantee */}
        <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 font-mono gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>TypeNova is completely ad-free and open for everyone</span>
          </div>
          <span>v2.9.0 • Handcrafted for typists</span>
        </div>
      </motion.div>
    </div>
  );
};
