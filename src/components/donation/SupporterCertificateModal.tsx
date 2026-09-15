import React, { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  Download,
  Share2,
  Check,
  X,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Crown,
  Copy,
  Calendar,
  Hash,
  Banknote,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Theme } from '@/data/constants';
import {
  formatCurrency,
  convertCurrency,
  generatePatronCertificateSerial,
  type CurrencyCode,
  type PatronEntry,
} from '@/data/donation';
import {
  FOUNDER_SIGNATURE_DATA_URL,
  FOUNDER_SIGNATURE_SRC,
  FOUNDER_SIGNATURE_ASPECT_RATIO,
} from '@/data/founderSignature';

/* ═══════════════════════════════════════════════════════════════════
   ORNAMENTAL SVG ELEMENTS — PREMIUM REDESIGN
   Bank-note-grade guilloché filigree, 32-point foil seal, watermark,
   decorative rules, and geometric border patterns
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Elaborate corner flourish with nested arcs, scroll motifs,
 * leaf-shaped details, and micro-dot accents
 */
const CornerFiligree: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className,
  style,
}) => (
  <svg
    width="72"
    height="72"
    viewBox="0 0 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    {/* Outer corner L-border with mitered end */}
    <path
      d="M3 69 V3 H69"
      stroke="#d4af37"
      strokeWidth="2.5"
      strokeLinecap="square"
      strokeOpacity="0.9"
    />
    {/* Second parallel hairline */}
    <path
      d="M7 65 V7 H65"
      stroke="#d4af37"
      strokeWidth="1"
      strokeOpacity="0.55"
    />
    {/* Third inner hairline */}
    <path
      d="M10.5 61.5 V10.5 H61.5"
      stroke="#d4af37"
      strokeWidth="0.5"
      strokeOpacity="0.35"
      strokeDasharray="1.5 1.5"
    />

    {/* Corner terminal rosette cluster */}
    <circle cx="3" cy="3" r="3.5" fill="#d4af37" />
    <circle cx="3" cy="3" r="2" fill="#fef3c7" />
    <circle cx="3" cy="3" r="0.8" fill="#d4af37" />
    {/* Secondary accent dots */}
    <circle cx="7" cy="7" r="1.8" fill="#d4af37" fillOpacity="0.7" />
    <circle cx="10.5" cy="10.5" r="1" fill="#fef3c7" fillOpacity="0.5" />

    {/* Primary concentric arc — large sweep */}
    <path
      d="M10 38 C26 38 38 26 38 10"
      stroke="#d4af37"
      strokeWidth="1.2"
      strokeOpacity="0.7"
      fill="none"
    />
    {/* Secondary arc */}
    <path
      d="M10 48 C34 48 48 34 48 10"
      stroke="#d4af37"
      strokeWidth="0.8"
      strokeOpacity="0.4"
      strokeDasharray="3 2"
      fill="none"
    />
    {/* Tertiary arc */}
    <path
      d="M10 56 C40 56 56 40 56 10"
      stroke="#d4af37"
      strokeWidth="0.5"
      strokeOpacity="0.25"
      strokeDasharray="1.5 2.5"
      fill="none"
    />

    {/* Fleur-de-lis scroll motif */}
    <path
      d="M20 20 C23 15 30 15 33 20 C30 25 25 30 20 33 C15 30 15 23 20 20 Z"
      fill="#d4af37"
      fillOpacity="0.2"
      stroke="#d4af37"
      strokeWidth="0.8"
      strokeOpacity="0.6"
    />
    {/* Center jewel */}
    <circle cx="22" cy="22" r="3" fill="#d4af37" fillOpacity="0.85" />
    <circle cx="22" cy="22" r="1.5" fill="#fef3c7" />

    {/* Leaf scroll extending along L */}
    <path
      d="M12 18 C14 12 20 12 22 16"
      stroke="#d4af37"
      strokeWidth="0.7"
      strokeOpacity="0.5"
      fill="none"
    />
    <path
      d="M18 12 C12 14 12 20 16 22"
      stroke="#d4af37"
      strokeWidth="0.7"
      strokeOpacity="0.5"
      fill="none"
    />

    {/* Micro-dot trail along outer border */}
    <circle cx="3" cy="18" r="0.8" fill="#d4af37" fillOpacity="0.4" />
    <circle cx="3" cy="33" r="0.8" fill="#d4af37" fillOpacity="0.4" />
    <circle cx="3" cy="48" r="0.8" fill="#d4af37" fillOpacity="0.4" />
    <circle cx="18" cy="3" r="0.8" fill="#d4af37" fillOpacity="0.4" />
    <circle cx="33" cy="3" r="0.8" fill="#d4af37" fillOpacity="0.4" />
    <circle cx="48" cy="3" r="0.8" fill="#d4af37" fillOpacity="0.4" />

    {/* Accent terminal dots at arc ends */}
    <circle cx="38" cy="10" r="1.2" fill="#d4af37" fillOpacity="0.6" />
    <circle cx="10" cy="38" r="1.2" fill="#d4af37" fillOpacity="0.6" />
    <circle cx="48" cy="10" r="0.8" fill="#d4af37" fillOpacity="0.35" />
    <circle cx="10" cy="48" r="0.8" fill="#d4af37" fillOpacity="0.35" />
  </svg>
);

/**
 * Decorative horizontal rule with center diamond and flanking scrollwork
 */
const DecorativeRule: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`flex items-center justify-center gap-2 ${className || ''}`}>
    {/* Left ornamental line */}
    <div className="flex items-center gap-1">
      <div className="w-1 h-1 rounded-full bg-[#d4af37]/40" />
      <div className="h-[1px] w-8 sm:w-14 bg-gradient-to-r from-transparent to-[#d4af37]/30" />
      <div className="h-[1px] w-16 sm:w-28 bg-gradient-to-r from-[#d4af37]/30 via-[#d4af37]/70 to-[#d4af37]" />
    </div>
    {/* Center diamond cluster */}
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 rotate-45 bg-[#d4af37]/30 border border-[#d4af37]/50" />
      <div className="w-2.5 h-2.5 rotate-45 border border-[#d4af37] bg-[#d4af37]/30 flex items-center justify-center">
        <div className="w-1 h-1 bg-[#fff4d0]" />
      </div>
      <div className="w-1.5 h-1.5 rotate-45 bg-[#d4af37]/30 border border-[#d4af37]/50" />
    </div>
    {/* Right ornamental line */}
    <div className="flex items-center gap-1">
      <div className="h-[1px] w-16 sm:w-28 bg-gradient-to-l from-[#d4af37]/30 via-[#d4af37]/70 to-[#d4af37]" />
      <div className="h-[1px] w-8 sm:w-14 bg-gradient-to-l from-transparent to-[#d4af37]/30" />
      <div className="w-1 h-1 rounded-full bg-[#d4af37]/40" />
    </div>
  </div>
);

/**
 * Guilloché-style geometric pattern border rendered as a thin repeating wave
 */
const GuillochePatternBorder: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`absolute pointer-events-none ${className || ''}`}>
    <svg width="100%" height="100%" preserveAspectRatio="none" className="absolute inset-0">
      <defs>
        <pattern id="guilloche-h" x="0" y="0" width="24" height="6" patternUnits="userSpaceOnUse">
          <path
            d="M0 3 Q6 0 12 3 Q18 6 24 3"
            stroke="#d4af37"
            strokeWidth="0.6"
            strokeOpacity="0.25"
            fill="none"
          />
        </pattern>
        <pattern id="guilloche-v" x="0" y="0" width="6" height="24" patternUnits="userSpaceOnUse">
          <path
            d="M3 0 Q0 6 3 12 Q6 18 3 24"
            stroke="#d4af37"
            strokeWidth="0.6"
            strokeOpacity="0.25"
            fill="none"
          />
        </pattern>
      </defs>
      {/* Top guilloché strip */}
      <rect x="0" y="0" width="100%" height="6" fill="url(#guilloche-h)" />
      {/* Bottom guilloché strip */}
      <rect x="0" y="calc(100% - 6px)" width="100%" height="6" fill="url(#guilloche-h)" />
      {/* Left guilloché strip */}
      <rect x="0" y="0" width="6" height="100%" fill="url(#guilloche-v)" />
      {/* Right guilloché strip */}
      <rect x="calc(100% - 6px)" y="0" width="6" height="100%" fill="url(#guilloche-v)" />
    </svg>
  </div>
);

/**
 * Diagonal watermark pattern — very subtle "TYPENOVA" repeating text
 */
const WatermarkPattern: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" style={{ opacity: 0.025 }}>
    <div
      className="absolute inset-0"
      style={{
        transform: 'rotate(-35deg) scale(1.5)',
        transformOrigin: 'center center',
      }}
    >
      {Array.from({ length: 12 }).map((_, row) => (
        <div key={row} className="flex gap-16 whitespace-nowrap" style={{ marginTop: row === 0 ? '-20%' : '28px' }}>
          {Array.from({ length: 8 }).map((_, col) => (
            <span
              key={col}
              className="text-[18px] font-mono font-black tracking-[0.5em] text-white"
            >
              TYPENOVA
            </span>
          ))}
        </div>
      ))}
    </div>
  </div>
);

/**
 * 32-point Scalloped Gold Foil Medallion with twin draped ribbons
 * — Enhanced version with additional concentric rings and micro-beading
 */
const OfficialFoilSeal: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`relative inline-flex items-center justify-center ${className || ''}`}>
    {/* Twin Draped Satin Ribbons behind the seal */}
    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-18 h-12 flex justify-between pointer-events-none">
      {/* Left ribbon */}
      <svg width="28" height="40" viewBox="0 0 28 40" fill="none" className="transform -rotate-12 -translate-x-1">
        <path
          d="M0 0 H28 V34 L14 26 L0 34 Z"
          fill="url(#ribbonGradLeft2)"
          filter="drop-shadow(0 4px 8px rgba(0,0,0,0.6))"
        />
        <path d="M2 0 V32 L14 25 L26 32 V0" stroke="#d4af37" strokeWidth="0.75" strokeOpacity="0.5" />
        <path d="M4 0 V30 L14 24 L24 30 V0" stroke="#fef3c7" strokeWidth="0.4" strokeOpacity="0.2" />
        <defs>
          <linearGradient id="ribbonGradLeft2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7f1d1d" />
            <stop offset="40%" stopColor="#991b1b" />
            <stop offset="70%" stopColor="#831843" />
            <stop offset="100%" stopColor="#450a0a" />
          </linearGradient>
        </defs>
      </svg>
      {/* Right ribbon */}
      <svg width="28" height="40" viewBox="0 0 28 40" fill="none" className="transform rotate-12 translate-x-1">
        <path
          d="M0 0 H28 V34 L14 26 L0 34 Z"
          fill="url(#ribbonGradRight2)"
          filter="drop-shadow(0 4px 8px rgba(0,0,0,0.6))"
        />
        <path d="M2 0 V32 L14 25 L26 32 V0" stroke="#d4af37" strokeWidth="0.75" strokeOpacity="0.5" />
        <path d="M4 0 V30 L14 24 L24 30 V0" stroke="#fef3c7" strokeWidth="0.4" strokeOpacity="0.2" />
        <defs>
          <linearGradient id="ribbonGradRight2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#991b1b" />
            <stop offset="40%" stopColor="#7f1d1d" />
            <stop offset="70%" stopColor="#831843" />
            <stop offset="100%" stopColor="#450a0a" />
          </linearGradient>
        </defs>
      </svg>
    </div>

    {/* 32-Point Gold Starburst Medallion */}
    <div className="relative w-22 h-22 sm:w-24 sm:h-24 rounded-full flex items-center justify-center filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.7)]">
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none" className="absolute inset-0">
        <defs>
          <linearGradient id="goldRadial2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff8db" />
            <stop offset="20%" stopColor="#f7d070" />
            <stop offset="50%" stopColor="#cda037" />
            <stop offset="75%" stopColor="#8d6415" />
            <stop offset="100%" stopColor="#ffe999" />
          </linearGradient>
          <radialGradient id="goldPlate2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffeaa7" />
            <stop offset="35%" stopColor="#d4af37" />
            <stop offset="70%" stopColor="#996515" />
            <stop offset="100%" stopColor="#573b08" />
          </radialGradient>
          <radialGradient id="goldCenter2" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="60%" stopColor="#5c2d0e" />
            <stop offset="100%" stopColor="#3d1e08" />
          </radialGradient>
        </defs>

        {/* 32-point scalloped starburst perimeter */}
        <path
          d={(() => {
            const cx = 48, cy = 48, points = 32;
            const outerR = 46, innerR = 40;
            let d = '';
            for (let i = 0; i < points; i++) {
              const angle1 = (i * 2 * Math.PI) / points - Math.PI / 2;
              const angle2 = ((i + 0.5) * 2 * Math.PI) / points - Math.PI / 2;
              const x1 = cx + outerR * Math.cos(angle1);
              const y1 = cy + outerR * Math.sin(angle1);
              const x2 = cx + innerR * Math.cos(angle2);
              const y2 = cy + innerR * Math.sin(angle2);
              d += (i === 0 ? 'M' : 'L') + `${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} `;
            }
            return d + 'Z';
          })()}
          fill="url(#goldRadial2)"
          stroke="#ffe999"
          strokeWidth="0.6"
        />

        {/* Outer concentric ring */}
        <circle cx="48" cy="48" r="35" fill="url(#goldPlate2)" stroke="#4a3000" strokeWidth="1" />
        {/* Beaded ring */}
        <circle
          cx="48" cy="48" r="32.5"
          stroke="#fff4d0" strokeWidth="1" strokeDasharray="1.5 1" strokeOpacity="0.85"
        />
        {/* Inner concentric ring */}
        <circle cx="48" cy="48" r="30" fill="url(#goldCenter2)" stroke="#784f0b" strokeWidth="0.75" />
        {/* Inner beaded accent ring */}
        <circle
          cx="48" cy="48" r="27.5"
          stroke="#d4af37" strokeWidth="0.5" strokeDasharray="1 1.5" strokeOpacity="0.5"
        />
      </svg>

      {/* Center Seal Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center text-[#fef3c7]">
        <Crown size={16} className="text-[#fef3c7] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
        <span className="text-[7px] font-mono font-black tracking-[0.2em] uppercase drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] mt-0.5">
          TYPENOVA
        </span>
        <span className="text-[6px] font-mono font-bold tracking-wider uppercase drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] -mt-0.5">
          VERIFIED PATRON
        </span>
        <div className="flex gap-0.5 mt-0.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-[2px] h-[2px] rounded-full bg-[#d4af37]" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════
   PROPS & COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export interface SupporterCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  callsign: string;
  amount: number;
  currency?: CurrencyCode;
  tierId?: string;
  txHash?: string;
  isOwner?: boolean;
  userRecords?: PatronEntry[];
}

export const SupporterCertificateModal: React.FC<SupporterCertificateModalProps> = ({
  isOpen,
  onClose,
  theme,
  callsign,
  amount,
  currency = 'USD',
  tierId,
  txHash,
  isOwner = true,
  userRecords = [],
}) => {
  const gp = theme.glowPrimary;
  const certRef = useRef<HTMLDivElement>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState(0);

  // Active record resolution when multiple contributions exist
  const activeRecord = useMemo(() => {
    if (userRecords && userRecords.length > 0) {
      return userRecords[selectedRecordIndex] || userRecords[0];
    }
    return null;
  }, [userRecords, selectedRecordIndex]);

  const activeAmount = activeRecord ? activeRecord.amount : amount;
  const activeCurrency = (activeRecord?.currency || currency || 'USD') as CurrencyCode;
  const activeTierId = activeRecord?.tierId || tierId;
  const activeTxHash = activeRecord?.txHash || txHash;
  const activeCallsign = (activeRecord?.name || callsign || 'Operator').trim();

  // Reset selected record index if records change
  useEffect(() => {
    setSelectedRecordIndex(0);
  }, [userRecords]);

  // Currency normalization: Calculate USD equivalent for accurate tier assignment
  const usdEquiv = useMemo(() => {
    return convertCurrency(activeAmount || 25, activeCurrency, 'USD');
  }, [activeAmount, activeCurrency]);

  // Authentic serial code (tied to callsign and USD equivalent)
  const serial = useMemo(() => {
    if (activeTxHash && activeTxHash.startsWith('TN-')) return activeTxHash;
    if (activeTxHash && activeTxHash.startsWith('pay_')) {
      return `TN-RP-${activeTxHash.replace('pay_', '').toUpperCase().slice(0, 8)}`;
    }
    return generatePatronCertificateSerial(activeCallsign || 'Operator', usdEquiv);
  }, [activeCallsign, usdEquiv, activeTxHash]);

  const issueDate = useMemo(() => {
    if (activeRecord?.date) {
      return new Date(activeRecord.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [activeRecord]);

  // Determine Tier Title & Class designation
  const tierMeta = useMemo(() => {
    if (activeTierId === 'tier_legend' || usdEquiv >= 50) {
      return {
        title: 'Eternal Benefactor',
        rank: 'CELESTIAL CLASS',
        badge: 'PATRON APEX',
        color: '#d4af37',
      };
    }
    if (activeTierId === 'tier_scholar' || usdEquiv >= 25) {
      return {
        title: 'Grand Architect',
        rank: 'HIGH ARCHITECT CLASS',
        badge: 'SCHOLAR BENEFACTOR',
        color: '#e5c07b',
      };
    }
    if (activeTierId === 'tier_sustainer' || usdEquiv >= 10) {
      return {
        title: 'Server Sustainer',
        rank: 'SUSTAINER CLASS',
        badge: 'INFRASTRUCTURE PILLAR',
        color: '#c0c0c0',
      };
    }
    return {
      title: 'Cyber Patron',
      rank: 'PATRON CLASS',
      badge: 'FOUNDING SUPPORTER',
      color: '#cd7f32',
    };
  }, [activeTierId, usdEquiv]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Copy share message for X/Discord
  const handleCopyShare = useCallback(() => {
    const text = `I just fueled TypeNova's sovereign, ad-free typing ecosystem and independent software development as a verified ${tierMeta.title}! 🚀 Verify: ${serial} | https://typenova.dev/donate`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopiedKey('share');
          toast.success('Accreditation announcement copied to clipboard!');
          setTimeout(() => setCopiedKey(null), 2500);
        })
        .catch(() => {
          toast.error('Failed to copy to clipboard');
        });
    }
  }, [tierMeta.title, serial]);

  // Copy GitHub badge markdown
  const handleCopyBadge = useCallback(() => {
    const badgeMd = `[![TypeNova ${tierMeta.title}](https://img.shields.io/badge/TypeNova-${encodeURIComponent(tierMeta.title)}-gold?style=for-the-badge&logo=heart)](https://typenova.dev/donate)`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(badgeMd)
        .then(() => {
          setCopiedKey('badge');
          toast.success('GitHub Profile Badge copied!');
          setTimeout(() => setCopiedKey(null), 2500);
        })
        .catch(() => {
          toast.error('Failed to copy badge');
        });
    }
  }, [tierMeta.title]);

  // Copy Serial Hash
  const handleCopySerial = useCallback(() => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(serial)
        .then(() => {
          setCopiedKey('serial');
          toast.success('Serial ID copied to clipboard!');
          setTimeout(() => setCopiedKey(null), 2000);
        })
        .catch(() => {
          toast.error('Failed to copy serial');
        });
    }
  }, [serial]);

  // ═══════════════════════════════════════════════════════════════════
  // ULTRA-HD 2400×1500 CANVAS EXPORTER — PREMIUM REDESIGN
  // ═══════════════════════════════════════════════════════════════════
  const handleDownload = useCallback(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2400;
    canvas.height = 1500;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // ── 1. BACKGROUND — Deep Obsidian Vignette ──
    const bgGrad = ctx.createRadialGradient(W / 2, H * 0.45, 80, W / 2, H * 0.5, W * 0.58);
    bgGrad.addColorStop(0, '#151a26');
    bgGrad.addColorStop(0.4, '#0d1018');
    bgGrad.addColorStop(0.75, '#080a10');
    bgGrad.addColorStop(1, '#040507');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // ── 2. AMBIENT GOLD GLOW — Central warm radiance ──
    const ambientGrad = ctx.createRadialGradient(W / 2, H * 0.38, 30, W / 2, H * 0.42, W * 0.4);
    ambientGrad.addColorStop(0, 'rgba(212, 175, 55, 0.14)');
    ambientGrad.addColorStop(0.6, 'rgba(212, 175, 55, 0.03)');
    ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = ambientGrad;
    ctx.fillRect(0, 0, W, H);

    // Secondary glow at bottom for seal area
    const sealGlow = ctx.createRadialGradient(W / 2, H * 0.82, 20, W / 2, H * 0.82, W * 0.2);
    sealGlow.addColorStop(0, 'rgba(212, 175, 55, 0.06)');
    sealGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sealGlow;
    ctx.fillRect(0, 0, W, H);

    // ── 3. NOISE TEXTURE OVERLAY — Subtle grain ──
    const noiseCount = 15000;
    for (let i = 0; i < noiseCount; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const brightness = Math.random() * 255;
      ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, 0.015)`;
      ctx.fillRect(x, y, 1, 1);
    }

    // ── 4. DIAGONAL WATERMARK PATTERN ──
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-0.6);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.018)';
    ctx.font = '900 42px monospace';
    ctx.textAlign = 'center';
    for (let row = -10; row < 10; row++) {
      for (let col = -5; col < 5; col++) {
        ctx.fillText('TYPENOVA', col * 460, row * 80);
      }
    }
    ctx.restore();

    // ── 5. FIVE-LAYER GUILLOCHÉ BORDER SYSTEM ──
    // Layer 1: Outer heavy gold rim
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 7;
    ctx.strokeRect(50, 50, W - 100, H - 100);

    // Layer 2: Intermediate gold hairline
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(65, 65, W - 130, H - 130);

    // Layer 3: Guilloché wave pattern border
    ctx.save();
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 0.8;
    // Top wave
    ctx.beginPath();
    for (let x = 78; x < W - 78; x += 1) {
      const y = 78 + Math.sin((x - 78) * 0.12) * 3;
      x === 78 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Bottom wave
    ctx.beginPath();
    for (let x = 78; x < W - 78; x += 1) {
      const y = H - 78 + Math.sin((x - 78) * 0.12) * 3;
      x === 78 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Left wave
    ctx.beginPath();
    for (let y = 78; y < H - 78; y += 1) {
      const x = 78 + Math.sin((y - 78) * 0.12) * 3;
      y === 78 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Right wave
    ctx.beginPath();
    for (let y = 78; y < H - 78; y += 1) {
      const x = W - 78 + Math.sin((y - 78) * 0.12) * 3;
      y === 78 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // Layer 4: Inner dashed boundary
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255, 248, 220, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(92, 92, W - 184, H - 184);
    ctx.setLineDash([]);

    // Layer 5: Innermost thin frame
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(100, 100, W - 200, H - 200);

    // ── 6. CORNER ORNAMENTS — Elaborate flourishes ──
    const drawCornerOrnament = (cx: number, cy: number, angle: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      // Main rosette
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();

      // L-bracket arms
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(0, 0); ctx.lineTo(40, 0); ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
      ctx.beginPath(); ctx.moveTo(5, -35); ctx.lineTo(5, 5); ctx.lineTo(35, 5); ctx.stroke();

      // Concentric arcs
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, 20, -Math.PI / 2, 0); ctx.stroke();
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.arc(0, 0, 28, -Math.PI / 2, 0); ctx.stroke();

      // Accent dots
      ctx.fillStyle = 'rgba(212, 175, 55, 0.6)';
      ctx.beginPath(); ctx.arc(20, 0, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -20, 2, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    };

    drawCornerOrnament(72, 72, 0);
    drawCornerOrnament(W - 72, 72, Math.PI / 2);
    drawCornerOrnament(W - 72, H - 72, Math.PI);
    drawCornerOrnament(72, H - 72, -Math.PI / 2);

    // ── 7. HEADER — Sovereign archival crest ──
    ctx.textAlign = 'center';

    // Decorative emblem dots above header
    ctx.fillStyle = '#d4af37';
    const dotY = 160;
    for (let i = -4; i <= 4; i++) {
      const r = i === 0 ? 3 : Math.abs(i) <= 2 ? 2 : 1.2;
      ctx.beginPath(); ctx.arc(W / 2 + i * 14, dotY, r, 0, Math.PI * 2); ctx.fill();
    }

    // Top Sovereign Archival Header
    ctx.fillStyle = '#d4af37';
    ctx.font = '700 22px monospace';
    ctx.letterSpacing = '6px';
    ctx.fillText('★  TYPENOVA ARCHIVAL LEDGER  ·  COGNITIVE RESEARCH TRUST  ★', W / 2, 200);

    ctx.fillStyle = '#7a8594';
    ctx.font = '500 16px monospace';
    ctx.fillText('ESTABLISHED MMXXV  •  PROTOCOL NON-FUNGIBLE ACCREDITATION  •  SOVEREIGN OPEN CORE', W / 2, 232);

    // Decorative rule under header
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(500, 252); ctx.lineTo(W / 2 - 12, 252); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2 + 12, 252); ctx.lineTo(W - 500, 252); ctx.stroke();
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.moveTo(W / 2, 245); ctx.lineTo(W / 2 + 7, 252); ctx.lineTo(W / 2, 259); ctx.lineTo(W / 2 - 7, 252);
    ctx.closePath(); ctx.fill();

    // ── 8. MAIN TITLE ──
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px sans-serif';
    ctx.fillText('CERTIFICATE OF SUSTENANCE', W / 2, 330);

    // Flanking rules beside title
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(200, 345); ctx.lineTo(500, 345); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - 500, 345); ctx.lineTo(W - 200, 345); ctx.stroke();

    // ── 9. TIER BANNER RIBBON ──
    // Banner background shape
    const bannerY = 375;
    const bannerW = 720;
    const bannerH = 48;
    const bx = W / 2 - bannerW / 2;

    ctx.fillStyle = 'rgba(212, 175, 55, 0.1)';
    ctx.beginPath();
    ctx.moveTo(bx - 20, bannerY);
    ctx.lineTo(bx + bannerW + 20, bannerY);
    ctx.lineTo(bx + bannerW, bannerY + bannerH);
    ctx.lineTo(bx, bannerY + bannerH);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx - 20, bannerY);
    ctx.lineTo(bx + bannerW + 20, bannerY);
    ctx.lineTo(bx + bannerW, bannerY + bannerH);
    ctx.lineTo(bx, bannerY + bannerH);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`✦  ${tierMeta.rank}  ·  ${tierMeta.title.toUpperCase()}  ✦`, W / 2, bannerY + 33);

    // ── 10. RECIPIENT CALLSIGN HERO ──
    ctx.fillStyle = '#8a919c';
    ctx.font = '600 20px monospace';
    ctx.fillText('THIS PERMANENT ACCREDITATION IS DULY CONFERRED UPON OPERATOR', W / 2, 500);

    const displayCallsign = (activeCallsign || 'ANONYMOUS BENEFACTOR').toUpperCase();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 80px sans-serif';
    ctx.fillText(displayCallsign, W / 2, 605);

    // Decorative filigree diamond divider
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(480, 645); ctx.lineTo(W / 2 - 30, 645); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2 + 30, 645); ctx.lineTo(W - 480, 645); ctx.stroke();

    // Triple diamond center
    ctx.fillStyle = '#d4af37';
    [-12, 0, 12].forEach(offset => {
      ctx.beginPath();
      ctx.moveTo(W / 2 + offset, 638);
      ctx.lineTo(W / 2 + offset + 5, 645);
      ctx.lineTo(W / 2 + offset, 652);
      ctx.lineTo(W / 2 + offset - 5, 645);
      ctx.closePath();
      ctx.fill();
    });

    // ── 11. CITATION STATEMENT ──
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(300, 680, W - 600, 80);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(300, 680, W - 600, 80);

    ctx.fillStyle = '#d0d6e0';
    ctx.font = 'italic 500 24px sans-serif';
    ctx.fillText(
      'In profound recognition of meritorious patronage and voluntary stewardship directly endowing',
      W / 2, 712,
    );
    ctx.fillText(
      "TypeNova's sovereign cloud infrastructure, real-time multiplayer relays, and ad-free computational research.",
      W / 2, 745,
    );

    // ── 12. STRUCTURED METADATA GRID — 3 columns ──
    const metaY = 800;
    const metaH = 75;
    const colW = 540;
    const gridX = (W - colW * 3 - 40) / 2;

    // Column backgrounds
    for (let i = 0; i < 3; i++) {
      const cx = gridX + i * (colW + 20);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(cx, metaY, colW, metaH);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.15)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(cx, metaY, colW, metaH);
    }

    // Column 1: Contribution Amount
    const c1x = gridX + colW / 2;
    ctx.fillStyle = '#6b7280';
    ctx.font = '700 14px monospace';
    ctx.fillText('TENDER RECORD', c1x, metaY + 22);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 28px monospace';
    ctx.fillText(formatCurrency(activeAmount || 25, activeCurrency), c1x, metaY + 56);

    // Column 2: Serial Number
    const c2x = gridX + colW + 20 + colW / 2;
    ctx.fillStyle = '#6b7280';
    ctx.font = '700 14px monospace';
    ctx.fillText('ARCHIVAL SERIAL', c2x, metaY + 22);
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '700 24px monospace';
    ctx.fillText(serial, c2x, metaY + 56);

    // Column 3: Issue Date
    const c3x = gridX + 2 * (colW + 20) + colW / 2;
    ctx.fillStyle = '#6b7280';
    ctx.font = '700 14px monospace';
    ctx.fillText('ISSUE TIMESTAMP', c3x, metaY + 22);
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '700 22px monospace';
    ctx.fillText(issueDate.toUpperCase(), c3x, metaY + 56);

    // ── 13. HOLOGRAPHIC ACCENT STRIP ──
    const stripY = 920;
    const stripGrad = ctx.createLinearGradient(200, stripY, W - 200, stripY);
    stripGrad.addColorStop(0, 'rgba(212, 175, 55, 0)');
    stripGrad.addColorStop(0.2, 'rgba(212, 175, 55, 0.08)');
    stripGrad.addColorStop(0.35, 'rgba(139, 92, 246, 0.06)');
    stripGrad.addColorStop(0.5, 'rgba(212, 175, 55, 0.12)');
    stripGrad.addColorStop(0.65, 'rgba(59, 130, 246, 0.06)');
    stripGrad.addColorStop(0.8, 'rgba(212, 175, 55, 0.08)');
    stripGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');
    ctx.fillStyle = stripGrad;
    ctx.fillRect(200, stripY, W - 400, 3);

    // ── 14. SIGNATURE BLOCK (Left) ──
    ctx.textAlign = 'left';

    try {
      const sigImg = new Image();
      sigImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        sigImg.onload = () => resolve();
        sigImg.onerror = () => resolve();
        sigImg.src = FOUNDER_SIGNATURE_DATA_URL;
        if (sigImg.complete) resolve();
      });

      if (sigImg.complete && sigImg.naturalWidth > 0) {
        const sigW = 340;
        const sigH = sigW / FOUNDER_SIGNATURE_ASPECT_RATIO;
        ctx.drawImage(sigImg, 300, 1200 - sigH + 28, sigW, sigH);
      } else {
        ctx.fillStyle = '#fef3c7';
        ctx.font = 'italic 700 54px "Dancing Script", "Caveat", cursive, sans-serif';
        ctx.fillText('Arunabha Ghosh', 300, 1190);
      }
    } catch {
      ctx.fillStyle = '#fef3c7';
      ctx.font = 'italic 700 54px "Dancing Script", "Caveat", cursive, sans-serif';
      ctx.fillText('Arunabha Ghosh', 300, 1190);
    }

    // Signature rule line
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(300, 1210); ctx.lineTo(740, 1210); ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 20px sans-serif';
    ctx.fillText('ARUNABHA GHOSH', 300, 1245);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '500 16px monospace';
    ctx.fillText('Founder & Lead Developer', 300, 1272);
    ctx.fillText('TypeNova Open Core Ecosystem', 300, 1296);
    ctx.fillText('AGPRIME', 300, 1320);

    // ── 15. OFFICIAL 32-POINT SCALLOPED FOIL SEAL (Center) ──
    ctx.save();
    ctx.translate(W / 2, 1200);

    // Twin Draped Ribbons
    ctx.fillStyle = '#831843';
    ctx.beginPath();
    ctx.moveTo(-50, 15); ctx.lineTo(-25, 140); ctx.lineTo(-50, 120); ctx.lineTo(-75, 140);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9f1239';
    ctx.beginPath();
    ctx.moveTo(50, 15); ctx.lineTo(75, 140); ctx.lineTo(50, 120); ctx.lineTo(25, 140);
    ctx.closePath(); ctx.fill();

    // 32-point scalloped starburst
    const sealPoints = 32;
    const sealOuterR = 90;
    const sealInnerR = 78;
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    for (let i = 0; i < sealPoints; i++) {
      const a1 = (i * 2 * Math.PI) / sealPoints - Math.PI / 2;
      const a2 = ((i + 0.5) * 2 * Math.PI) / sealPoints - Math.PI / 2;
      const x1 = sealOuterR * Math.cos(a1);
      const y1 = sealOuterR * Math.sin(a1);
      const x2 = sealInnerR * Math.cos(a2);
      const y2 = sealInnerR * Math.sin(a2);
      i === 0 ? ctx.moveTo(x1, y1) : ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Outer concentric ring
    ctx.fillStyle = '#996515';
    ctx.beginPath(); ctx.arc(0, 0, 72, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Beaded ring
    ctx.strokeStyle = '#fff4d0';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 1.5]);
    ctx.beginPath(); ctx.arc(0, 0, 67, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // Inner plate
    ctx.fillStyle = '#78350f';
    ctx.beginPath(); ctx.arc(0, 0, 62, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#784f0b';
    ctx.lineWidth = 0.75;
    ctx.stroke();

    // Inner beaded ring
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
    ctx.setLineDash([1, 2]);
    ctx.beginPath(); ctx.arc(0, 0, 56, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // Center seal text
    ctx.fillStyle = '#fef3c7';
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('★ TYPENOVA ★', 0, -12);
    ctx.font = '900 13px monospace';
    ctx.fillText('VERIFIED PATRON', 0, 10);
    ctx.font = '700 11px monospace';
    ctx.fillText('COGNITIVE TRUST', 0, 28);

    // Micro-dot ring
    ctx.fillStyle = '#d4af37';
    for (let i = 0; i < 24; i++) {
      const a = (i * 2 * Math.PI) / 24;
      ctx.beginPath();
      ctx.arc(50 * Math.cos(a), 50 * Math.sin(a), 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // ── 16. SECURITY LEDGER (Right) ──
    ctx.textAlign = 'right';

    // Hash visualization block — simple grid pattern
    const hashX = W - 300;
    const hashY = 1130;
    ctx.fillStyle = 'rgba(212, 175, 55, 0.15)';
    const hashStr = serial.replace(/[^A-Z0-9]/g, '');
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 8; col++) {
        const charCode = hashStr.charCodeAt((row * 8 + col) % hashStr.length) || 65;
        const opacity = 0.05 + (charCode % 20) * 0.015;
        ctx.fillStyle = `rgba(212, 175, 55, ${opacity})`;
        ctx.fillRect(hashX + col * 10, hashY + row * 10, 8, 8);
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 22px monospace';
    ctx.fillText(serial, W - 300, 1205);

    // Verification Rule Line
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(W - 740, 1210); ctx.lineTo(W - 300, 1210); ctx.stroke();

    ctx.fillStyle = '#9ca3af';
    ctx.font = '500 16px monospace';
    ctx.fillText('Cryptographic Archival Hash', W - 300, 1245);
    ctx.fillText('Consensus Block #4912 · Validated', W - 300, 1272);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 16px monospace';
    ctx.fillText(issueDate, W - 300, 1296);
    ctx.fillStyle = '#10b981';
    ctx.font = '700 16px monospace';
    ctx.fillText('● AUDIT SECURE & IMMUTABLE', W - 300, 1320);

    // ── DOWNLOAD TRIGGER ──
    canvas.toBlob((blob) => {
      if (!blob) {
        const link = document.createElement('a');
        link.download = `TypeNova_Accreditation_Certificate_${serial}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('Ultra-HD 2400×1500 Certificate PNG downloaded!');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `TypeNova_Accreditation_Certificate_${serial}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Ultra-HD 2400×1500 Certificate PNG downloaded!');
    }, 'image/png');
  }, [activeCallsign, activeAmount, activeCurrency, serial, issueDate, tierMeta]);

  // ═══════════════════════════════════════════════════════════════════
  // JSX PREVIEW — PREMIUM INTERACTIVE CERTIFICATE
  // ═══════════════════════════════════════════════════════════════════

  const effectiveCallsign = (activeCallsign || 'Operator').trim();
  if (!isOpen || !activeAmount || activeAmount <= 0 || !effectiveCallsign) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[var(--z-modal-nested)] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl rounded-[2rem] p-1 bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-white/[0.08] border border-white/20 shadow-[0_30px_90px_rgba(0,0,0,0.9)] relative my-auto"
      >
        <div className="p-4 sm:p-6 lg:p-7 rounded-[calc(2rem-0.25rem)] bg-[#07090e] border border-white/[0.08] space-y-4 sm:space-y-5">

          {/* ── MODAL HEADER BAR ── */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center border"
                style={{
                  backgroundColor: `rgba(${gp}, 0.15)`,
                  borderColor: `rgba(${gp}, 0.4)`,
                  color: `rgb(${gp})`,
                  boxShadow: `0 0 16px rgba(${gp}, 0.25)`,
                }}
              >
                <Award size={19} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                  {isOwner ? 'Official Digital Certificate' : 'Public Verified Accreditation'}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold tracking-wider ${
                    isOwner
                      ? 'bg-amber-400/10 border border-amber-400/30 text-amber-300'
                      : 'bg-emerald-400/10 border border-emerald-400/30 text-emerald-300'
                  }`}>
                    {isOwner ? tierMeta.rank : 'AUTHENTICATED LEDGER'}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  {isOwner
                    ? 'TypeNova Archival Cognition Ledger • Non-Fungible Commendation'
                    : 'TypeNova Archival Cognition Ledger • Public Verified Accreditation'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-colors cursor-pointer"
              aria-label="Close certificate dialog"
            >
              <X size={17} />
            </button>
          </div>

          {/* ── MULTI-CONTRIBUTION SELECTOR (if user has > 1 verified record) ── */}
          {userRecords && userRecords.length > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
              <span className="text-[10px] sm:text-xs font-mono text-zinc-400 uppercase tracking-wider font-semibold mr-1 flex items-center gap-1.5">
                <Sparkles size={12} style={{ color: `rgb(${gp})` }} />
                Verified Contributions ({userRecords.length}):
              </span>
              {userRecords.map((rec, idx) => {
                const isSelected = idx === selectedRecordIndex;
                const recAmt = formatCurrency(rec.amount, rec.currency || 'USD');
                const recTier = rec.tierId === 'tier_legend' ? 'Legend' : rec.tierId === 'tier_scholar' ? 'Architect' : rec.tierId === 'tier_sustainer' ? 'Sustainer' : 'Patron';
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedRecordIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'border'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/10'
                    }`}
                    style={isSelected ? {
                      backgroundColor: `rgba(${gp}, 0.15)`,
                      color: `rgb(${gp})`,
                      borderColor: `rgba(${gp}, 0.4)`,
                      boxShadow: `0 0 12px rgba(${gp}, 0.25)`,
                    } : undefined}
                  >
                    <span>Record #{idx + 1}:</span>
                    <span className="text-white">{recAmt}</span>
                    <span className="text-[10px]" style={{ color: `rgba(${gp}, 0.8)` }}>({recTier})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
             MUSEUM-GRADE LUXURY CERTIFICATE CANVAS PREVIEW — HORIZONTAL LANDSCAPE
             ═══════════════════════════════════════════════════════════════════ */}
          <div
            ref={certRef}
            className="w-full rounded-2xl border-2 border-[#c5a059]/75 bg-[#080a0f] relative overflow-hidden text-center select-none"
            style={{
              boxShadow:
                '0 0 60px rgba(197, 160, 89, 0.2), inset 0 0 50px rgba(197, 160, 89, 0.06)',
            }}
          >
            {/* Background Ambient Radial Gradient */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 30%, rgba(212, 175, 55, 0.13) 0%, rgba(13, 16, 24, 0.6) 50%, rgba(7, 9, 14, 0.98) 100%)',
              }}
            />

            {/* Secondary ambient glow at bottom */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 90%, rgba(212, 175, 55, 0.06) 0%, transparent 50%)',
              }}
            />

            {/* Watermark Pattern */}
            <WatermarkPattern />

            {/* 5-Layer Border System */}
            {/* Layer 1: Outer gold frame */}
            <div className="absolute inset-2 sm:inset-2.5 border-2 border-[#c5a059]/50 rounded-xl pointer-events-none" />
            {/* Layer 2: Intermediate hairline */}
            <div className="absolute inset-3 sm:inset-4 border border-[#d4af37]/30 rounded-lg pointer-events-none" />
            {/* Layer 3: Guilloché pattern border */}
            <GuillochePatternBorder className="inset-[14px] sm:inset-[18px] rounded-md" />
            {/* Layer 4: Inner dashed boundary */}
            <div
              className="absolute inset-4 sm:inset-5 border border-dashed border-[#fff8dc]/15 rounded-md pointer-events-none"
            />
            {/* Layer 5: Innermost thin frame */}
            <div className="absolute inset-5 sm:inset-6 border border-[#d4af37]/10 rounded pointer-events-none" />

            {/* Corner Filigrees */}
            <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 pointer-events-none">
              <CornerFiligree />
            </div>
            <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 pointer-events-none rotate-90">
              <CornerFiligree />
            </div>
            <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 pointer-events-none rotate-180">
              <CornerFiligree />
            </div>
            <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 pointer-events-none -rotate-90">
              <CornerFiligree />
            </div>

            {/* Inner Certificate Content Container — Balanced Horizontal Rhythm */}
            <div className="relative z-10 px-6 py-6 sm:px-12 sm:py-7 lg:px-16 lg:py-8 space-y-3 sm:space-y-3.5 flex flex-col justify-between">

              {/* ── TOP ARCHIVAL HEADER & CREST ── */}
              <div className="space-y-1 sm:space-y-1.5">
                {/* Decorative dot cluster */}
                <div className="flex items-center justify-center gap-1.5">
                  {[1, 1.5, 2, 2.5, 3, 2.5, 2, 1.5, 1].map((s, i) => (
                    <div
                      key={i}
                      className="rounded-full bg-[#d4af37]"
                      style={{ width: `${s * 2}px`, height: `${s * 2}px`, opacity: 0.3 + s * 0.15 }}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2 text-[#d4af37] text-[9px] sm:text-[11px] font-mono font-bold tracking-[0.3em] uppercase">
                  <span>★</span>
                  <span>TYPENOVA ARCHIVE · COMMUNITY COGNITIVE TRUST</span>
                  <span>★</span>
                </div>

                <div className="text-[8px] sm:text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">
                  ESTABLISHED MMXXV • PROTOCOL NON-FUNGIBLE ACCREDITATION • SOVEREIGN OPEN CORE
                </div>

                <DecorativeRule className="my-0.5" />

                <h2
                  className="text-2xl sm:text-3xl lg:text-4xl font-black font-display tracking-wide uppercase pt-0.5"
                  style={{
                    background:
                      'linear-gradient(180deg, #FFFFFF 15%, #FFF5D6 45%, #E2BA55 75%, #AC7C19 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 0 40px rgba(212,175,55,0.25)',
                  }}
                >
                  CERTIFICATE OF SUSTENANCE
                </h2>

                {/* Tier Medallion Banner */}
                <div className="relative inline-block pt-0.5">
                  <div
                    className="px-6 py-1 border border-[#d4af37]/50 text-[#ffd700] text-[10px] sm:text-[11px] font-mono font-extrabold shadow-[0_0_20px_rgba(212,175,55,0.25)]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.06) 100%)',
                      clipPath: 'polygon(4% 0%, 96% 0%, 100% 50%, 96% 100%, 4% 100%, 0% 50%)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles size={12} className="text-amber-300 animate-pulse" />
                      <span>
                        ✦ {tierMeta.rank} · {tierMeta.title.toUpperCase()} ✦
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── RECIPIENT CALLSIGN HERO ── */}
              <div className="py-0.5 space-y-1 max-w-3xl mx-auto">
                <p className="text-[9px] sm:text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em] font-medium">
                  THIS PERMANENT ACCREDITATION IS DULY CONFERRED UPON OPERATOR
                </p>

                <div
                  className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight font-sans py-0.5"
                  style={{
                    background:
                      'linear-gradient(180deg, #FFFFFF 10%, #FDF3D0 40%, #D4AF37 80%, #AA7C11 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 2px 12px rgba(212,175,55,0.35))',
                  }}
                >
                  {activeCallsign ? activeCallsign.toUpperCase() : 'ANONYMOUS BENEFACTOR'}
                </div>

                {/* Decorative Filigree Divider — Triple Diamond */}
                <div className="flex items-center justify-center gap-2 pt-0.5">
                  <div className="h-[1px] w-20 sm:w-36 bg-gradient-to-r from-transparent via-[#d4af37]/60 to-[#d4af37]" />
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rotate-45 bg-[#d4af37]/30 border border-[#d4af37]/40" />
                    <div className="w-2.5 h-2.5 rotate-45 border border-[#d4af37] bg-[#d4af37]/30 flex items-center justify-center">
                      <div className="w-1 h-1 bg-[#fff4d0]" />
                    </div>
                    <div className="w-1.5 h-1.5 rotate-45 bg-[#d4af37]/30 border border-[#d4af37]/40" />
                  </div>
                  <div className="h-[1px] w-20 sm:w-36 bg-gradient-to-l from-transparent via-[#d4af37]/60 to-[#d4af37]" />
                </div>
              </div>

              {/* ── CITATION NARRATIVE ── */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2 sm:py-2.5 max-w-3xl mx-auto">
                <p className="text-[11px] sm:text-xs text-zinc-300 font-sans leading-relaxed italic">
                  In profound recognition of meritorious patronage and voluntary stewardship directly sustaining TypeNova&apos;s sovereign cloud infrastructure, real-time multiplayer relays, and ad-free computational research.
                </p>
              </div>

              {/* ── STRUCTURED METADATA GRID — 3 columns ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-3xl mx-auto w-full">
                {/* Amount */}
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-0.5">
                    <Banknote size={10} className="text-zinc-500" />
                    <span>TENDER RECORD</span>
                  </div>
                  <div className="text-sm sm:text-base font-bold text-amber-300 font-mono">
                    {formatCurrency(activeAmount || 25, activeCurrency)}
                  </div>
                </div>

                {/* Serial */}
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-0.5">
                    <Hash size={10} className="text-zinc-500" />
                    <span>ARCHIVAL SERIAL</span>
                  </div>
                  <button
                    onClick={handleCopySerial}
                    className="text-xs sm:text-sm font-bold text-amber-200 hover:text-amber-100 font-mono transition-colors cursor-pointer inline-flex items-center gap-1"
                    title="Click to copy serial"
                  >
                    <span>{serial}</span>
                    <Copy size={10} className="text-zinc-400" />
                  </button>
                </div>

                {/* Status */}
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-0.5">
                    <Calendar size={10} className="text-zinc-500" />
                    <span>VERIFICATION</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-400 font-mono flex items-center justify-center gap-1">
                    <ShieldCheck size={13} /> VERIFIED
                  </div>
                </div>
              </div>

              {/* ── HOLOGRAPHIC ACCENT STRIP ── */}
              <div
                className="h-[1.5px] mx-8 sm:mx-16 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15), rgba(139,92,246,0.1), rgba(212,175,55,0.25), rgba(59,130,246,0.1), rgba(212,175,55,0.15), transparent)',
                }}
              />

              {/* ── BOTTOM TRI-SECTION: Signature | Seal | Ledger ── */}
              <div className="pt-3 sm:pt-4 border-t border-[#c5a059]/20 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-2">

                {/* Left: Authentic Handwritten Signature */}
                <div className="text-center sm:text-left space-y-0.5 w-full sm:w-1/3">
                  <div className="h-12 sm:h-14 flex items-center justify-center sm:justify-start -mb-1">
                    <img
                      src={FOUNDER_SIGNATURE_SRC}
                      alt="Arunabha Ghosh Authentic Signature"
                      className="h-full max-w-[170px] object-contain filter drop-shadow-[0_0_8px_rgba(212,175,55,0.45)] select-none pointer-events-none"
                      loading="eager"
                    />
                  </div>
                  <div className="w-32 sm:w-40 h-[1px] bg-[#c5a059]/40 mx-auto sm:mx-0" />
                  <div className="text-xs font-bold text-white tracking-wider font-sans">
                    ARUNABHA GHOSH
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400 leading-tight">
                    Founder &amp; Lead Developer
                    <br />
                    <span className="text-zinc-500">TypeNova Core Ecosystem</span>
                    <br />
                    <span className="text-zinc-600 text-[9px]">AGPRIME</span>
                  </div>
                </div>

                {/* Center: 32-point Scalloped Gold Medallion Foil Seal */}
                <div className="w-full sm:w-1/3 flex justify-center py-1 sm:py-0">
                  <OfficialFoilSeal />
                </div>

                {/* Right: Security Ledger Stamp & Issue Date */}
                <div className="text-center sm:text-right space-y-1 w-full sm:w-1/3">
                  {/* Hash visualization micro-grid */}
                  <div className="flex justify-center sm:justify-end gap-[2px] mb-0.5">
                    {Array.from({ length: 16 }).map((_, i) => {
                      const charCode = serial.charCodeAt(i % serial.length) || 65;
                      const opacity = 0.1 + (charCode % 15) * 0.04;
                      return (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-[1px]"
                          style={{ backgroundColor: `rgba(212, 175, 55, ${opacity})` }}
                        />
                      );
                    })}
                  </div>
                  <button
                    onClick={handleCopySerial}
                    className="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-200 hover:text-amber-100 transition-colors cursor-pointer"
                    title="Click to copy serial"
                  >
                    <span>{serial}</span>
                    <Copy size={11} className="text-zinc-400" />
                  </button>
                  <div className="w-32 sm:w-40 h-[1px] bg-[#c5a059]/40 mx-auto sm:ml-auto" />
                  <div className="text-xs font-bold text-white tracking-wider font-mono">
                    {issueDate}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400 leading-tight">
                    Cryptographic Ledger Timestamp
                    <br />
                    <span className="text-emerald-400">● On-Chain Consensus Validated</span>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
             ACTION TOOLBAR
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleDownload}
                className="py-3.5 rounded-xl font-mono text-xs font-black transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-lg border hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  backgroundColor: `rgb(${gp})`,
                  color: '#000000',
                  borderColor: `rgb(${gp})`,
                  boxShadow: `0 0 24px rgba(${gp}, 0.4)`,
                }}
              >
                <Download size={16} />
                <span>{isOwner ? 'DOWNLOAD ULTRA-HD PNG (300 DPI)' : 'DOWNLOAD VERIFIED PROOF (300 DPI)'}</span>
              </button>

              <button
                onClick={handleCopyShare}
                className="py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              >
                {copiedKey === 'share' ? (
                  <Check size={16} className="text-emerald-400" />
                ) : (
                  <Share2 size={16} />
                )}
                <span>
                  {copiedKey === 'share' ? 'COPIED TO CLIPBOARD' : isOwner ? 'COPY SHARE ANNOUNCEMENT' : 'COPY VERIFIED LINK'}
                </span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between pt-1 gap-2 text-[11px] font-mono text-zinc-400">
              <button
                onClick={handleCopyBadge}
                className="hover:text-white underline underline-offset-4 decoration-white/20 hover:decoration-white transition-colors cursor-pointer"
              >
                {copiedKey === 'badge'
                  ? '✓ GitHub Profile Badge Markdown Copied'
                  : 'Copy GitHub profile badge markdown'}
              </button>

              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  `I just fueled @TypeNovaApp's sovereign open-source typing ecosystem and independent software development as a verified ${tierMeta.title}! 🚀 Serial: ${serial} https://typenova.dev/donate`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors flex items-center gap-1.5 text-zinc-300"
              >
                <span>Share on X (Twitter)</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
