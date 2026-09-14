import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  X,
  Send,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Theme } from '@/data/constants';
import {
  recordPatronContribution,
  type PatronPlatform,
  type CurrencyCode,
} from '@/data/donation';

export interface RecordContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  defaultAmount?: number;
  defaultCurrency?: CurrencyCode;
  onContributionRecorded: (name: string, amount: number) => void;
}

export const RecordContributionModal: React.FC<RecordContributionModalProps> = ({
  isOpen,
  onClose,
  theme,
  defaultAmount = 10,
  defaultCurrency = 'USD',
  onContributionRecorded,
}) => {
  const gp = theme.glowPrimary;

  const [callsign, setCallsign] = useState('');
  const [amount, setAmount] = useState<string>(String(defaultAmount));
  const [platform, setPlatform] = useState<PatronPlatform>('upi');
  const [message, setMessage] = useState('');
  const [txRef, setTxRef] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDone, setIsDone] = useState(false);

  // Keyboard shortcut: Escape to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDone) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDone, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const numAmount = Number(amount);
    if (!callsign.trim()) {
      setErrorMsg('Please enter your operator callsign or name');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid contribution amount');
      return;
    }

    const trimmedName = callsign.trim();
    const today = new Date().toISOString().split('T')[0];

    recordPatronContribution({
      name: trimmedName,
      amount: numAmount,
      currency: defaultCurrency || 'USD',
      platform,
      message: message.trim() || undefined,
      date: today,
      txHash: txRef.trim() || undefined,
    });

    setIsDone(true);
    toast.success('Contribution recorded on the Patron Wall!', {
      description: 'Your holographic card is now radiating on the live ledger.',
    });

    setTimeout(() => {
      onContributionRecorded(trimmedName, numAmount);
      onClose();
      setIsDone(false);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg rounded-[1.75rem] p-1 bg-white/[0.04] border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.85)] relative"
      >
        <div className="p-6 sm:p-7 rounded-[calc(1.75rem-0.25rem)] bg-[#0a0d14] border border-white/[0.06] space-y-5">

          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Heart size={18} style={{ color: `rgb(${gp})` }} />
                <h3 className="text-base font-bold text-white font-mono">
                  Claim Backer Recognition
                </h3>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Post your transfer to the Community Patron Wall &amp; equip titles
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {isDone ? (
            <div className="py-8 text-center space-y-3 font-mono">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 size={26} />
              </div>
              <h4 className="text-base font-bold text-white">Added to Patron Wall!</h4>
              <p className="text-xs text-zinc-400">
                Updating ledger and equipping your Cyber Patron title...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
              {/* Callsign */}
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 uppercase tracking-wider block">
                  Operator Callsign / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya_R or Anonymous"
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-white/15 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-white/50 transition-colors"
                />
              </div>

              {/* Amount & Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400 uppercase tracking-wider block">
                    Amount Contributed ({defaultCurrency}) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[1-9][0-9]*"
                    data-keyboard-isolated="true"
                    required
                    placeholder="10"
                    value={amount}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                        e.preventDefault();
                        return;
                      }
                      const selStart = e.currentTarget.selectionStart ?? 0;
                      const selEnd = e.currentTarget.selectionEnd ?? 0;
                      if (
                        e.key === '0' &&
                        (amount.length === 0 || (selStart === 0 && selEnd === amount.length))
                      ) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
                      setAmount(clean);
                    }}
                    className="w-full px-3.5 py-2.5 bg-black/50 border border-white/15 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-white/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* Platform */}
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400 uppercase tracking-wider block">
                    Payment Method
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as PatronPlatform)}
                    className="w-full px-3.5 py-2.5 bg-black/50 border border-white/15 rounded-xl text-white focus:outline-none focus:border-white/50 transition-colors cursor-pointer"
                  >
                    <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="kofi">Ko-fi</option>
                    <option value="bmc">Buy Me a Coffee</option>
                    <option value="paypal">PayPal</option>
                    <option value="github">GitHub Sponsors</option>
                    <option value="crypto">Crypto (BTC / ETH / SOL)</option>
                  </select>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 uppercase tracking-wider block">
                  Encouragement Note (Optional)
                </label>
                <textarea
                  rows={2}
                  maxLength={120}
                  placeholder="e.g. Good luck with semester exams! Love the app."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2 bg-black/50 border border-white/15 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-white/50 transition-colors resize-none"
                />
              </div>

              {/* Optional Ref */}
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 uppercase tracking-wider block">
                  UTR / Transaction ID / Tx Hash (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / Bank Ref"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-white/15 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-white/50 transition-colors"
                />
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg border"
                style={{
                  backgroundColor: `rgb(${gp})`,
                  color: '#000000',
                  borderColor: `rgb(${gp})`,
                  boxShadow: `0 0 20px rgba(${gp}, 0.35)`,
                }}
              >
                <Send size={14} />
                <span>POST TO PATRON WALL &amp; EQUIP PERKS</span>
              </button>
            </form>
          )}

        </div>
      </motion.div>
    </div>
  );
};
