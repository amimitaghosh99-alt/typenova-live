import React, { useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  Download,
  Share2,
  Check,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Theme } from '@/data/constants';
import {
  formatCurrency,
  generatePatronCertificateSerial,
  type CurrencyCode,
} from '@/data/donation';

export interface SupporterCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  callsign: string;
  amount: number;
  currency?: CurrencyCode;
}

export const SupporterCertificateModal: React.FC<SupporterCertificateModalProps> = ({
  isOpen,
  onClose,
  theme,
  callsign,
  amount,
  currency = 'USD',
}) => {
  const gp = theme.glowPrimary;
  const certRef = useRef<HTMLDivElement>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const serial = React.useMemo(() => {
    return generatePatronCertificateSerial(callsign || 'Operator', amount || 10);
  }, [callsign, amount]);

  const issueDate = React.useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const tierTitle = React.useMemo(() => {
    if (amount >= 50) return 'Eternal Benefactor';
    if (amount >= 25) return 'Grand Architect';
    if (amount >= 10) return 'Server Sustainer';
    return 'Cyber Patron';
  }, [amount]);

  // Keyboard shortcut: Escape to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Copy share message for X/Discord
  const handleCopyShare = useCallback(() => {
    const text = `I just fueled TypeNova's ad-free, open-source typing ecosystem & student college tuition fund as a ${tierTitle}! 🚀 Verify: ${serial} | https://typenova.dev/donate`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey('share');
      toast.success('Share announcement copied to clipboard!');
      setTimeout(() => setCopiedKey(null), 2500);
    }
  }, [tierTitle, serial]);

  // Copy GitHub badge markdown
  const handleCopyBadge = useCallback(() => {
    const badgeMd = `[![TypeNova ${tierTitle}](https://img.shields.io/badge/TypeNova-${encodeURIComponent(tierTitle)}-gold?style=for-the-badge&logo=heart)](https://typenova.dev/donate)`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(badgeMd);
      setCopiedKey('badge');
      toast.success('GitHub Profile Badge copied!');
      setTimeout(() => setCopiedKey(null), 2500);
    }
  }, [tierTitle]);

  // Download High-Resolution Canvas PNG
  const handleDownload = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background Obsidian
    ctx.fillStyle = '#07090e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle gradient glow
    const grad = ctx.createRadialGradient(600, 400, 50, 600, 400, 600);
    grad.addColorStop(0, 'rgba(212, 175, 55, 0.15)');
    grad.addColorStop(1, 'rgba(7, 9, 14, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Guilloché Gold Rim Border
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(52, 52, canvas.width - 104, canvas.height - 104);

    // Corner Ornaments
    const drawCorner = (x: number, y: number) => {
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(x - 8, y - 8, 16, 16);
    };
    drawCorner(52, 52);
    drawCorner(canvas.width - 52, 52);
    drawCorner(52, canvas.height - 52);
    drawCorner(canvas.width - 52, canvas.height - 52);

    // Header Text
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a1a1aa';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('TYPENOVA ARCHIVE // COMMUNITY COGNITIVE TRUST', 600, 110);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 42px "Space Grotesk", sans-serif';
    ctx.fillText('CERTIFICATE OF SUSTENANCE', 600, 170);

    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`HONORING: ${tierTitle.toUpperCase()}`, 600, 215);

    // Divider Line
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.beginPath();
    ctx.moveTo(250, 240);
    ctx.lineTo(950, 240);
    ctx.stroke();

    // Recipient Name
    ctx.fillStyle = '#71717a';
    ctx.font = '16px monospace';
    ctx.fillText('THIS HIGH COMMENDATION IS CONFERRED UPON OPERATOR', 600, 290);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px sans-serif';
    ctx.fillText(callsign || 'ANONYMOUS BENEFACTOR', 600, 360);

    // Citation Body
    ctx.fillStyle = '#d4d4d8';
    ctx.font = '18px sans-serif';
    ctx.fillText(
      'In recognition of exceptional patronage directly fueling open-source high-tick infrastructure,',
      600,
      430
    );
    ctx.fillText(
      'private ad-free typing technology, and undergraduate university academic tuition fees.',
      600,
      465
    );

    // Contribution & Serial
    ctx.fillStyle = '#a1a1aa';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(
      `CONTRIBUTION: ${formatCurrency(amount || 25, currency)} • SERIAL: ${serial}`,
      600,
      540
    );

    // Footer Signatures
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Amimita Ghosh', 180, 670);
    ctx.font = '13px monospace';
    ctx.fillStyle = '#a1a1aa';
    ctx.fillText('Founder & Undergraduate Student Maintainer', 180, 695);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(issueDate, 1020, 670);
    ctx.font = '13px monospace';
    ctx.fillStyle = '#a1a1aa';
    ctx.fillText('Verified Timestamp & Ledger Hash', 1020, 695);

    // Download Trigger
    const link = document.createElement('a');
    link.download = `TypeNova_Sustenance_Certificate_${serial}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Certificate PNG generated and downloaded!');
  }, [callsign, amount, currency, serial, issueDate, tierTitle]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-2xl rounded-[1.75rem] p-1 bg-white/[0.04] border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.85)] relative"
      >
        <div className="p-6 sm:p-7 rounded-[calc(1.75rem-0.25rem)] bg-[#07090e] border border-white/[0.06] space-y-6">

          {/* Modal Top Bar */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-2">
              <Award size={18} style={{ color: `rgb(${gp})` }} />
              <h3 className="text-base font-bold text-white font-mono">
                Official Digital Certificate
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Luxury Certificate Canvas Preview */}
          <div
            ref={certRef}
            className="p-6 sm:p-8 rounded-2xl border-2 border-[#d4af37]/60 bg-[#090b10] relative overflow-hidden shadow-2xl space-y-6 text-center"
            style={{
              boxShadow: '0 0 40px rgba(212, 175, 55, 0.15), inset 0 0 30px rgba(212, 175, 55, 0.05)',
            }}
          >
            {/* Guilloché Frame Inset */}
            <div className="absolute inset-2 border border-white/10 rounded-xl pointer-events-none" />

            {/* Top Archive Emblem */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono tracking-widest text-[#d4af37] uppercase font-bold">
                TYPENOVA ARCHIVE // COMMUNITY COGNITIVE TRUST
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight">
                CERTIFICATE OF SUSTENANCE
              </h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37] text-xs font-mono font-bold">
                <Sparkles size={11} />
                <span>HONORING: {tierTitle.toUpperCase()}</span>
              </div>
            </div>

            {/* Recipient Callsign */}
            <div className="py-2 space-y-1">
              <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                This honor is permanently conferred upon operator
              </p>
              <div className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight">
                {callsign || 'Anonymous Benefactor'}
              </div>
            </div>

            {/* Citation Statement */}
            <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed max-w-md mx-auto">
              In gratitude for exceptional patronage directly sustaining high-tick cloud multiplayer servers, ad-free typing analytics, and undergraduate university engineering tuition fees.
            </p>

            {/* Serial & Timestamp */}
            <div className="pt-2 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-zinc-400 gap-2">
              <div className="text-center sm:text-left">
                <span className="block text-zinc-300 font-bold">Amimita Ghosh</span>
                <span className="text-[10px]">Founder &amp; Student Maintainer</span>
              </div>

              <div className="text-center sm:text-right">
                <span className="block text-zinc-200 font-bold">{serial}</span>
                <span className="text-[10px] text-zinc-400">{issueDate}</span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={handleDownload}
                className="py-3 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg border"
                style={{
                  backgroundColor: `rgb(${gp})`,
                  color: '#000000',
                  borderColor: `rgb(${gp})`,
                  boxShadow: `0 0 20px rgba(${gp}, 0.35)`,
                }}
              >
                <Download size={14} />
                <span>DOWNLOAD HIGH-RES PNG</span>
              </button>

              <button
                onClick={handleCopyShare}
                className="py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedKey === 'share' ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
                <span>{copiedKey === 'share' ? 'COPIED TO CLIPBOARD' : 'COPY SHARE TEXT'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-zinc-400">
              <button
                onClick={handleCopyBadge}
                className="hover:text-white underline underline-offset-4 decoration-white/20 hover:decoration-white transition-colors cursor-pointer"
              >
                {copiedKey === 'badge' ? '✓ GitHub Badge Copied' : 'Copy GitHub profile badge markdown'}
              </button>

              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  `I just fueled @TypeNovaApp's open-source typing ecosystem and student tuition fund as a ${tierTitle}! 🚀 Verify: ${serial} https://typenova.dev/donate`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors flex items-center gap-1"
              >
                <span>Post on X</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
