import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Heart,
  Sparkles,
  ShieldCheck,
  Globe,
  Award,
  Share2,
  GraduationCap,
  Server,
  BookOpen,
  Code2,
  CreditCard,
  DollarSign,
  Lock,
  Crown,
  RotateCcw,
  Trash2,
  ThumbsUp,
  ChevronDown,
  Quote,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface BackerRoadmapItem {
  id: string;
  title: string;
  tag: string;
  status: string;
  description: string;
  baseVotes: number;
}

const BACKER_ROADMAP_ITEMS: BackerRoadmapItem[] = [
  {
    id: 'ghost-duels',
    title: 'Asynchronous Ghost Duels & Replays',
    tag: 'MULTIPLAYER',
    status: 'IN DEVELOPMENT',
    description: 'Race against any leaderboard champion replay frame-by-frame even when they are offline.',
    baseVotes: 142,
  },
  {
    id: 'sound-engine',
    title: 'Custom Cyber-Mech Keystroke Soundpacks',
    tag: 'AUDIO ENGINE',
    status: 'COMMUNITY VOTING',
    description: 'High-fidelity mechanical switch audio profiles: Topre capacitive, Holy Panda tactile, and Vintage Alps.',
    baseVotes: 98,
  },
  {
    id: 'custom-drills',
    title: 'AI Smart Drills v2 — Code Syntax Generator',
    tag: 'TRAINING',
    status: 'COMMUNITY VOTING',
    description: 'Dynamically generated algorithmic typing drills across Rust, TypeScript, Python, and C++ ASTs.',
    baseVotes: 87,
  },
  {
    id: 'team-tournaments',
    title: 'Crew Battles & Regional Tournaments',
    tag: 'ESPORTS',
    status: 'PLANNED',
    description: 'Create typing crews, compete in scheduled weekend cups, and claim territory on the planetary map.',
    baseVotes: 64,
  },
];
import {
  DONATION_CONFIG,
  SUPPORTED_CURRENCIES,
  convertCurrency,
  formatCurrency,
  SUPPORTER_TIERS,
  type CurrencyCode,
  type PatronEntry,
  getUnlockedPatronTitles,
  syncUserPatronStatus,
  isPatronTitle,
  fetchDatabasePatrons,
  fetchTuitionGoalTotal,
  getLocalPatrons,
  getSupporterEntitlements,
  resetPatronData,
  removeLocalPatron,
  clearAllLocalPatrons,
  resolveUserContributions,
  POPULAR_CURRENCIES,
} from '@/data/donation';
import { getActiveTitleId, setActiveTitleId } from '@/data/titles';
import type { Theme } from '@/data/constants';
import { PaymentGatewayModal } from '@/components/donation/PaymentGatewayModal';
import { SupporterCertificateModal } from '@/components/donation/SupporterCertificateModal';
import { CurrencyPickerModal } from '@/components/donation/CurrencyPickerModal';
import { useAuth } from '@/hooks/useAuth';

// Luxury frosted avatar styling with concentric depth & generative tonal tint
function getAvatarStyle(name: string, isCelestial: boolean, isArchitect: boolean, gp: string) {
  const safe = (name || 'Anonymous').trim();
  let hash = 0;
  for (let i = 0; i < safe.length; i++) hash = safe.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;

  if (isCelestial) {
    return {
      background: `radial-gradient(circle at 35% 35%, rgba(${gp}, 0.28), rgba(255, 255, 255, 0.03) 70%, rgba(12, 14, 20, 0.95))`,
      borderColor: `rgba(${gp}, 0.45)`,
      boxShadow: `0 0 20px rgba(${gp}, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.25)`,
      color: '#ffffff',
    };
  }

  if (isArchitect) {
    return {
      background: `radial-gradient(circle at 35% 35%, rgba(${gp}, 0.16), rgba(255, 255, 255, 0.02) 70%, rgba(12, 14, 20, 0.95))`,
      borderColor: `rgba(${gp}, 0.25)`,
      boxShadow: `0 0 12px rgba(${gp}, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.18)`,
      color: '#f4f4f5',
    };
  }

  return {
    background: `radial-gradient(circle at 35% 35%, hsla(${hue}, 45%, 55%, 0.18), rgba(15, 18, 26, 0.95))`,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.1)',
    color: '#e4e4e7',
  };
}

function getPlatformMeta(platform?: string) {
  switch (platform?.toLowerCase()) {
    case 'github':
      return { label: 'GitHub Sponsor', icon: Code2 };
    case 'upi':
      return { label: 'UPI Transit', icon: Sparkles };
    case 'kofi':
      return { label: 'Ko-fi Patron', icon: Heart };
    case 'bmc':
      return { label: 'Buy Me a Coffee', icon: Heart };
    case 'paypal':
      return { label: 'PayPal Verified', icon: Globe };
    case 'crypto':
      return { label: 'Web3 / Crypto', icon: Lock };
    case 'gateway':
      return { label: 'Vault Gateway', icon: CreditCard };
    default:
      return { label: (platform || 'DIRECT').toUpperCase(), icon: ShieldCheck };
  }
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
  username?: string | null;
}

type WallFilter = 'all' | 'top' | 'recent';

export const PatronVault: React.FC<PatronVaultProps> = ({
  onBack,
  theme,
  onTitleEquipped,
  username,
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('INR');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [selectedAmount, setSelectedAmount] = useState<number>(250);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  const [activeTitle, setActiveTitle] = useState<string>(() => getActiveTitleId());

  const auth = useAuth();
  const [unlockedTitles, setUnlockedTitles] = useState<Set<string>>(() => getUnlockedPatronTitles());

  const effectiveUserName = useMemo(() => {
    return (
      username?.trim() ||
      auth.user?.user_metadata?.full_name?.trim() ||
      auth.user?.user_metadata?.name?.trim() ||
      (auth.user?.email ? auth.user.email.split('@')[0] : '') ||
      ''
    );
  }, [username, auth.user]);

  // Re-sync verified patron titles when user authenticates or payment settles
  useEffect(() => {
    let active = true;
    syncUserPatronStatus(auth.user?.id).then((synced) => {
      if (active) setUnlockedTitles(new Set(synced));
    });

    const handleUpdated = (e: Event) => {
      const custom = e as CustomEvent<{ unlocked?: string[] }>;
      if (custom.detail?.unlocked) {
        setUnlockedTitles(new Set(custom.detail.unlocked));
      } else {
        setUnlockedTitles(getUnlockedPatronTitles());
      }
    };

    window.addEventListener('patronTitlesUpdated', handleUpdated);
    return () => {
      active = false;
      window.removeEventListener('patronTitlesUpdated', handleUpdated);
    };
  }, [auth.user?.id]);

  const [selectedTierId, setSelectedTierId] = useState<string>('tier_supporter');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false);

  const popularCurrencyList = useMemo(() => {
    const primaries: CurrencyCode[] = [...POPULAR_CURRENCIES];
    if (selectedCurrency && !primaries.includes(selectedCurrency)) {
      primaries.push(selectedCurrency);
    }
    return primaries;
  }, [selectedCurrency]);
  const [certificateData, setCertificateData] = useState<{
    callsign: string;
    amount: number;
    currency: CurrencyCode;
    tierId?: string;
    txHash?: string;
    isOwner?: boolean;
    userRecords?: PatronEntry[];
  }>(() => ({
    callsign: '',
    amount: 0,
    currency: 'USD',
    isOwner: true,
  }));

  // Listen for local patron record additions/removals
  useEffect(() => {
    const handleContributions = () => {
      setPatronRefreshCounter((c) => c + 1);
    };
    window.addEventListener('patronContributionsUpdated', handleContributions);
    return () => {
      window.removeEventListener('patronContributionsUpdated', handleContributions);
    };
  }, []);

  const [wallFilter, setWallFilter] = useState<WallFilter>('all');
  const [patronRefreshCounter, setPatronRefreshCounter] = useState(0);

  const [dbPatrons, setDbPatrons] = useState<PatronEntry[]>([]);
  const [liveGoalTotal, setLiveGoalTotal] = useState<number>(DONATION_CONFIG.goal.currentAmount);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchDatabasePatrons(), fetchTuitionGoalTotal()]).then(([patrons, total]) => {
      if (!mounted) return;
      setDbPatrons(patrons);
      setLiveGoalTotal(total);
    });
    return () => {
      mounted = false;
    };
  }, [patronRefreshCounter]);

  const goal = DONATION_CONFIG.goal;
  const progressPercent = useMemo(() => {
    if (goal.targetAmount <= 0) return 0;
    return Math.min(100, Math.round((liveGoalTotal / goal.targetAmount) * 100));
  }, [liveGoalTotal, goal.targetAmount]);

  const gp = theme.glowPrimary;

  const combinedPatrons = useMemo(() => {
    // 1. Get real verified local contributions (ignore simulation sandbox entries)
    const locals = getLocalPatrons()
      .filter(
        (p) =>
          typeof p.amount === 'number' &&
          p.amount > 0 &&
          !p.txHash?.startsWith('TN-SIM-') &&
          p.message !== 'Sandbox Simulated Contribution'
      )
      .map((p) => ({ ...p, isLocal: true }));

    // 2. Map database patrons, avoiding duplicates with local entries (txHash and composite key)
    const seenHashes = new Set(locals.map((p) => p.txHash).filter(Boolean));
    const seenComposites = new Set(locals.map((p) => `${p.name || ''}_${p.date || ''}_${p.amount}_${p.currency || 'USD'}`));
    const remote = dbPatrons
      .filter((p) => {
        if (p.txHash && seenHashes.has(p.txHash)) return false;
        const comp = `${p.name || ''}_${p.date || ''}_${p.amount}_${p.currency || 'USD'}`;
        if (seenComposites.has(comp)) return false;
        return true;
      })
      .map((p) => ({ ...p, isLocal: false }));

    const list: (PatronEntry & { isLocal?: boolean })[] = [...locals, ...remote];
    // If no live patrons exist yet, display curated featured patrons to preserve social proof
    const baseList = list.length > 0
      ? list
      : DONATION_CONFIG.featuredPatrons.map((p) => ({ ...p, isLocal: false }));

    if (wallFilter === 'top') {
      // Filter to top tiers and sort by converted USD equivalence
      const filtered = baseList.filter((p) => {
        const usd = convertCurrency(p.amount, (p.currency as CurrencyCode) || 'USD', 'USD');
        return usd >= 25 || p.tierId === 'tier_scholar' || p.tierId === 'tier_legend';
      });
      return filtered.sort((a, b) => {
        const usdB = convertCurrency(b.amount, (b.currency as CurrencyCode) || 'USD', 'USD');
        const usdA = convertCurrency(a.amount, (a.currency as CurrencyCode) || 'USD', 'USD');
        return usdB - usdA;
      });
    }
    if (wallFilter === 'recent') {
      return [...baseList].sort((a, b) => {
        const timeB = new Date(b.date).getTime() || 0;
        const timeA = new Date(a.date).getTime() || 0;
        return timeB - timeA;
      });
    }
    // Default 'all': Sort by impact descending so Apex sovereign benefactors lead the wall
    return [...baseList].sort((a, b) => {
      const usdB = convertCurrency(b.amount, (b.currency as CurrencyCode) || 'USD', 'USD');
      const usdA = convertCurrency(a.amount, (a.currency as CurrencyCode) || 'USD', 'USD');
      return usdB - usdA;
    });
  }, [dbPatrons, wallFilter, patronRefreshCounter]);

  const wallMetrics = useMemo(() => {
    const totalUsd = combinedPatrons.reduce((sum, p) => {
      return sum + convertCurrency(p.amount, (p.currency as CurrencyCode) || 'USD', 'USD');
    }, 0);
    const apexUsd = combinedPatrons.reduce((max, p) => {
      const amt = convertCurrency(p.amount, (p.currency as CurrencyCode) || 'USD', 'USD');
      return amt > max ? amt : max;
    }, 0);
    return {
      totalUsd,
      apexUsd,
      count: combinedPatrons.length,
    };
  }, [combinedPatrons]);

  // Backer feature voting state
  const [votedFeatureIds, setVotedFeatureIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('typenova_backer_votes');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const handleVoteFeature = (featureId: string) => {
    setVotedFeatureIds((prev) => {
      const next = new Set(prev);
      if (next.has(featureId)) {
        next.delete(featureId);
        toast.info('Vote removed');
      } else {
        next.add(featureId);
        toast.success('Vote recorded for upcoming feature!', {
          description: 'Backer votes directly shape development priority.',
        });
      }
      try {
        localStorage.setItem('typenova_backer_votes', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Celestial Benefactors engraved into the Hall of Fame
  const celestialBenefactors = useMemo(() => {
    const result: { name: string; title: string; amount?: number }[] = [
      { name: 'Aetheris Sovereign', title: 'Eternal Benefactor' },
      { name: 'Vanguard_01', title: 'Eternal Benefactor' },
    ];

    combinedPatrons.forEach((p) => {
      const usd = convertCurrency(p.amount, p.currency || 'USD', 'USD');
      if (usd >= 50 || p.tierId === 'tier_legend') {
        if (!result.some((r) => r.name.toLowerCase() === p.name.toLowerCase())) {
          result.push({ name: p.name, title: 'Eternal Benefactor', amount: usd });
        }
      }
    });

    if (effectiveUserName && unlockedTitles.has('eternal_benefactor')) {
      if (!result.some((r) => r.name.toLowerCase() === effectiveUserName.toLowerCase())) {
        result.unshift({ name: effectiveUserName, title: 'Eternal Benefactor' });
      }
    }

    return result;
  }, [combinedPatrons, effectiveUserName, unlockedTitles]);

  // Verified contributions belonging to the current user (resolved with highest tier and exact tender)
  const userContributionResolution = useMemo(() => {
    if (!effectiveUserName) {
      return {
        primaryRecord: null as PatronEntry | null,
        allRecords: [] as PatronEntry[],
        totalContributedUsd: 0,
      };
    }
    const allRecords = [...getLocalPatrons(), ...getSupporterEntitlements(), ...dbPatrons];
    const resolved = resolveUserContributions(effectiveUserName, allRecords);
    if (resolved.primaryRecord) {
      return resolved;
    }

    // Secondary fallback: check if user has unlocked patron titles as permanent entitlement
    const titles = getUnlockedPatronTitles();
    if (titles.size > 0) {
      let inferredTier = 'tier_supporter';
      let inferredAmount = 3;
      if (titles.has('eternal_benefactor')) {
        inferredTier = 'tier_legend';
        inferredAmount = 50;
      } else if (titles.has('grand_architect')) {
        inferredTier = 'tier_scholar';
        inferredAmount = 25;
      } else if (titles.has('server_sustainer')) {
        inferredTier = 'tier_sustainer';
        inferredAmount = 10;
      }
      const fallbackEntry: PatronEntry = {
        name: effectiveUserName,
        amount: inferredAmount,
        currency: 'USD' as CurrencyCode,
        platform: 'gateway' as const,
        date: new Date().toISOString().split('T')[0],
        tierId: inferredTier,
        txHash: undefined,
      };
      return {
        primaryRecord: fallbackEntry,
        allRecords: [fallbackEntry],
        totalContributedUsd: inferredAmount,
      };
    }

    return {
      primaryRecord: null,
      allRecords: [],
      totalContributedUsd: 0,
    };
  }, [effectiveUserName, dbPatrons, patronRefreshCounter]);

  const userVerifiedContribution = userContributionResolution.primaryRecord;

  const hasLocalPatrons = useMemo(() => {
    if (!effectiveUserName) return false;
    return combinedPatrons.some(
      (p) => p.isLocal && p.name.toLowerCase() === effectiveUserName.toLowerCase()
    );
  }, [combinedPatrons, effectiveUserName]);

  const handleClearAllMyRecords = useCallback(() => {
    clearAllLocalPatrons();
    setPatronRefreshCounter((c) => c + 1);
    toast.success('Your local contribution records have been removed', {
      description: 'The community supporters wall has been refreshed.',
    });
  }, []);

  const handleRemoveSingleRecord = useCallback((patron: PatronEntry) => {
    removeLocalPatron({ txHash: patron.txHash, name: patron.name, date: patron.date });
    setPatronRefreshCounter((c) => c + 1);
    toast.success(`Removed record for ${patron.name} ($${patron.amount})`);
  }, []);

  const isCustomInvalid = isCustomMode && (!customAmount || parseInt(customAmount, 10) < 1);

  const activeAmount = useMemo(() => {
    if (isCustomMode) {
      const parsed = parseInt(customAmount, 10);
      return !isNaN(parsed) && parsed >= 1 ? parsed : 1;
    }
    return selectedAmount && selectedAmount >= 1 ? selectedAmount : 250;
  }, [isCustomMode, customAmount, selectedAmount]);

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
      if (e.key === 'Escape' && onBack && !isCheckoutOpen && !isCertificateOpen && !isCurrencyPickerOpen) {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack, isCheckoutOpen, isCertificateOpen, isCurrencyPickerOpen]);

  const handleShare = useCallback(() => {
    const url = window.location.origin + '/donate';
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedKey('share');
      toast.success('Patron Vault URL copied!', { description: url });
      setTimeout(() => setCopiedKey(null), 2500);
    }
  }, []);

  // Automatically revoke and reset unverified supporter titles equipped previously
  useEffect(() => {
    const cur = getActiveTitleId();
    if (isPatronTitle(cur) && !unlockedTitles.has(cur)) {
      setActiveTitleId('novice');
      setActiveTitle('novice');
      onTitleEquipped?.('novice');
    }
  }, [unlockedTitles, onTitleEquipped]);

  const handleEquipTitle = useCallback(
    (titleId: string, titleName: string) => {
      if (isPatronTitle(titleId) && !unlockedTitles.has(titleId)) {
        toast.error('Supporter Title Locked', {
          description: `You must back the ${titleName} tier in the Patron Vault to unlock this title.`,
        });
        return;
      }
      setActiveTitleId(titleId);
      setActiveTitle(titleId);
      onTitleEquipped?.(titleId);
      toast.success(`Holographic "${titleName}" Title Equipped!`, {
        description: 'Radiating in your dossier, leaderboards, and lobbies.',
      });
    },
    [unlockedTitles, onTitleEquipped]
  );

  const handlePaymentSuccess = useCallback(
    (details: {
      name: string;
      amount: number;
      currency: CurrencyCode;
      txHash: string;
      platform: 'gateway' | 'upi';
      message?: string;
    }) => {
      setCertificateData({
        callsign: details.name,
        amount: details.amount,
        currency: details.currency,
        tierId: selectedTierId,
        txHash: details.txHash,
      });
      setPatronRefreshCounter((prev) => prev + 1);
    },
    [selectedTierId]
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

      <div className="relative z-10 w-full px-5 sm:px-8 lg:px-12 py-6 sm:py-8 space-y-8 mx-auto" style={{ maxWidth: 'clamp(640px, 92vw, 1600px)' }}>
        
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
                    {c} ({SUPPORTED_CURRENCIES[c].symbol}) — {SUPPORTED_CURRENCIES[c].name}
                  </option>
                ))}
              </select>
            </div>
            
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
        <div className="py-16 lg:py-24 max-w-5xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-[0.2em] uppercase bg-white/[0.03] border border-white/[0.08] text-zinc-400 mb-6">
            <GraduationCap size={14} style={{ color: `rgb(${gp})` }} />
            <span>COMMUNITY SUSTENANCE &amp; CLOUD LEDGER</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-white">
            Fuel TypeNova &amp;{' '}
            <span
              className="inline-block"
              style={{
                color: `rgb(${gp})`,
                textShadow: `0 0 40px rgba(${gp}, 0.4)`,
              }}
            >
              Support Independent Craft.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 max-w-3xl leading-relaxed mt-6">
            TypeNova is engineered entirely by a solo independent developer dedicated to crafting the ultimate typing experience.
            There is zero venture capital, zero paywalled stats, and zero ad-tracking telemetry.
            Every contribution directly maintains our global multiplayer cloud servers and sustains ongoing independent development.
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
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 block mb-2">INDEPENDENT CLOUD &amp; DEV GOAL</span>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                    ${liveGoalTotal} / ${goal.targetAmount}
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

            {/* Privacy & Ads */}
            <div className="rounded-2xl p-px bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
              <div className="rounded-[calc(1rem-1px)] bg-[#0a0d14]/90 p-5 sm:p-6 lg:p-8 h-full backdrop-blur-xl flex flex-col justify-center">
                <ShieldCheck size={24} style={{ color: `rgb(${gp})` }} className="mb-4 opacity-80" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 block mb-1">PRIVACY ETHICS</span>
                <div className="text-xl sm:text-2xl font-black text-white">100% Ad-Free</div>
              </div>
            </div>

            {/* Source Code */}
            <div className="rounded-2xl p-px bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
              <div className="rounded-[calc(1rem-1px)] bg-[#0a0d14]/90 p-5 sm:p-6 lg:p-8 h-full backdrop-blur-xl flex flex-col justify-center">
                <Code2 size={24} style={{ color: `rgb(${gp})` }} className="mb-4 opacity-80" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 block mb-1">SOURCE CODE</span>
                <div className="text-xl sm:text-2xl font-black text-white">GPL v3 Open</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 4 - Payment Terminal */}
        <motion.div
          id="payment-terminal"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="py-14 sm:py-20"
        >
          <div className="text-center mb-10">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 block mb-2">
              AUTOMATED VERIFIED GATEWAY
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Fund TypeNova.</h2>
            <p className="text-sm text-zinc-400 mt-2 max-w-xl mx-auto">
              Real-time payment verification powered by Razorpay. All contributions automatically unlock exclusive Patron Titles and Badges.
            </p>
          </div>

          <div className="max-w-4xl mx-auto rounded-2xl p-px bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
            <div className="rounded-[calc(1rem-1px)] bg-[#0a0d14]/90 p-6 sm:p-8 lg:p-10 backdrop-blur-xl space-y-8">
              
              {/* Header inside card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.06] pb-6 gap-4">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <ShieldCheck size={20} style={{ color: `rgb(${gp})` }} />
                    Live Payment Terminal
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Accepts UPI (GPay, PhonePe, Paytm, QR), Cards (Visa, Mastercard, RuPay) & NetBanking.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-mono font-bold flex items-center gap-1.5">
                    <Sparkles size={12} /> Instant Title Unlock
                  </span>
                  <span className="px-3 py-1 bg-white/[0.04] text-zinc-300 border border-white/10 rounded-full text-xs font-mono font-bold">
                    256-Bit SSL
                  </span>
                </div>
              </div>

              {/* Currency & Amount Minimalist Control Bar */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-white/[0.02] border border-white/5 rounded-2xl">
                  {/* Amount presets */}
                  <div className="flex flex-wrap items-center gap-2">
                    {SUPPORTED_CURRENCIES[selectedCurrency].suggestedAmounts.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => {
                          setIsCustomMode(false);
                          setSelectedAmount(amt);
                        }}
                        className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all border ${
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
                      className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all border ${
                        isCustomMode
                          ? 'bg-white/[0.08] text-white border-white/20'
                          : 'bg-white/[0.02] text-zinc-400 border-white/5 hover:border-white/10 hover:text-zinc-200'
                      }`}
                      style={isCustomMode ? { borderColor: `rgba(${gp}, 0.5)`, backgroundColor: `rgba(${gp}, 0.1)`, color: `rgb(${gp})` } : {}}
                    >
                      CUSTOM
                    </button>
                  </div>

                  <span className="w-1.5 h-1.5 rounded-full bg-white/10 shrink-0 hidden sm:block" />

                  {/* Currency Picker */}
                  <div className="flex flex-wrap items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/5 text-xs font-mono">
                    {popularCurrencyList.map((curr) => (
                      <button
                        key={curr}
                        onClick={() => handleCurrencyChange(curr)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                          selectedCurrency === curr ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                        style={selectedCurrency === curr ? { color: `rgb(${gp})` } : {}}
                      >
                        {curr}
                      </button>
                    ))}
                    <button
                      onClick={() => setIsCurrencyPickerOpen(true)}
                      className="px-2.5 py-1 rounded-lg font-bold text-zinc-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Explore 135+ global currencies"
                    >
                      <span>+ More</span>
                      <ChevronDown size={13} />
                    </button>
                  </div>
                </div>
                
                {isCustomMode && (
                  <div className="flex flex-col gap-1.5 mt-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1 max-w-xs">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-mono">
                          {SUPPORTED_CURRENCIES[selectedCurrency].symbol}
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[1-9][0-9]*"
                          data-keyboard-isolated="true"
                          value={customAmount}
                          onKeyDown={(e) => {
                            // Block non-numeric characters and scientific notation
                            if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                              e.preventDefault();
                              return;
                            }
                            // Disallow typing '0' when empty or when replacing entire text
                            const selStart = e.currentTarget.selectionStart ?? 0;
                            const selEnd = e.currentTarget.selectionEnd ?? 0;
                            if (
                              e.key === '0' &&
                              (customAmount.length === 0 || (selStart === 0 && selEnd === customAmount.length))
                            ) {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => {
                            // Strip any non-digit and strip leading zeros so 0 can never be the first character
                            const clean = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
                            setCustomAmount(clean);
                          }}
                          placeholder="Enter amount"
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-mono focus:outline-none focus:border-white/30 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">
                      Minimum contribution: {SUPPORTED_CURRENCIES[selectedCurrency].symbol}1 (first digit must be 1&ndash;9)
                    </span>
                  </div>
                )}
              </div>

              {/* Main Checkout Trigger */}
              <div className="py-4 text-center">
                <button
                  disabled={isCustomInvalid}
                  onClick={() => {
                    if (isCustomInvalid) return;
                    const inUsd = convertCurrency(activeAmount, selectedCurrency, 'USD');
                    const targetTier =
                      inUsd >= 50
                        ? 'tier_legend'
                        : inUsd >= 25
                        ? 'tier_scholar'
                        : inUsd >= 10
                        ? 'tier_sustainer'
                        : 'tier_supporter';
                    setSelectedTierId(targetTier);
                    setIsCheckoutOpen(true);
                  }}
                  className={`w-full sm:w-auto px-10 py-5 rounded-2xl font-black text-lg sm:text-xl inline-flex items-center justify-center gap-3 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.1)] ${
                    isCustomInvalid
                      ? 'bg-white/5 text-zinc-600 border border-white/5 cursor-not-allowed'
                      : 'text-black hover:scale-105 active:scale-95 cursor-pointer'
                  }`}
                  style={!isCustomInvalid ? { backgroundColor: `rgb(${gp})`, boxShadow: `0 0 40px rgba(${gp}, 0.3)` } : {}}
                >
                  <Lock size={20} className={isCustomInvalid ? 'text-zinc-600' : 'text-black/70'} />
                  {isCustomInvalid
                    ? `ENTER AMOUNT (MIN ${SUPPORTED_CURRENCIES[selectedCurrency].symbol}1)`
                    : `LAUNCH SECURE CHECKOUT — ${formatCurrency(activeAmount, selectedCurrency)}`}
                </button>
                <div className="mt-4 text-xs text-zinc-400 font-mono flex items-center justify-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1"><Check size={12} className="text-emerald-400" /> UPI (GPay, PhonePe, Paytm, QR)</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="flex items-center gap-1"><Check size={12} className="text-emerald-400" /> Cards &amp; NetBanking</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="flex items-center gap-1"><Check size={12} className="text-emerald-400" /> Instant Title Grant</span>
                </div>
              </div>

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
            <div className="flex items-center gap-2.5 flex-wrap">
              {(unlockedTitles.size > 0 || hasLocalPatrons) && (
                <button
                  onClick={() => {
                    resetPatronData();
                    setUnlockedTitles(new Set());
                    setActiveTitle('novice');
                    setPatronRefreshCounter((c) => c + 1);
                    toast.info('Supporter data and titles reset', {
                      description: 'All local contribution records and titles have been cleared.',
                    });
                  }}
                  className="px-4 py-2.5 rounded-full font-mono text-xs font-bold text-zinc-400 hover:text-rose-400 bg-white/[0.03] hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Reset local supporter test data and titles"
                >
                  <RotateCcw size={13} /> RESET TITLES & DATA
                </button>
              )}
              {userVerifiedContribution && (
                <button
                  onClick={() => {
                    setCertificateData({
                      callsign: userVerifiedContribution.name,
                      amount: userVerifiedContribution.amount,
                      currency: userVerifiedContribution.currency || 'USD',
                      tierId: userVerifiedContribution.tierId,
                      txHash: userVerifiedContribution.txHash,
                      isOwner: true,
                      userRecords: userContributionResolution.allRecords,
                    });
                    setIsCertificateOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-full font-mono text-xs font-bold text-amber-300 bg-amber-400/10 border border-amber-400/30 hover:bg-amber-400/20 transition-all flex items-center gap-2 w-fit cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.15)]"
                >
                  <Award size={14} /> MY CERTIFICATE
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SUPPORTER_TIERS.map((tier) => {
              const isUnlocked = unlockedTitles.has(tier.titleRewardId);
              const isEquipped = isUnlocked && activeTitle === tier.titleRewardId;
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
                      <div className="text-sm font-bold flex items-center gap-1.5" style={{ color: tier.color }}>
                        {!isUnlocked && <Lock size={12} className="text-zinc-500 shrink-0" />}
                        <span>Title: &quot;{tier.titleRewardName}&quot;</span>
                      </div>
                    </div>
                    
                    <ul className="space-y-3 mb-8 flex-1">
                      {tier.perks.map((perk, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-zinc-400 font-mono">
                          <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          const converted = convertCurrency(tier.usdAmount, 'USD', selectedCurrency);
                          setSelectedAmount(converted);
                          setSelectedTierId(tier.id);
                          setIsCustomMode(false);
                          setIsCheckoutOpen(true);
                        }}
                        className="w-full py-3 rounded-xl font-mono text-xs font-black transition-all flex items-center justify-center gap-2 border bg-white text-black hover:bg-white/90 shadow-lg cursor-pointer"
                      >
                        <CreditCard size={14} /> BACK THIS TIER
                      </button>

                      <button
                        onClick={() => {
                          if (isUnlocked) {
                            handleEquipTitle(tier.titleRewardId, tier.titleRewardName);
                          } else {
                            const converted = convertCurrency(tier.usdAmount, 'USD', selectedCurrency);
                            setSelectedAmount(converted);
                            setSelectedTierId(tier.id);
                            setIsCustomMode(false);
                            setIsCheckoutOpen(true);
                            toast.info(`Back ${tier.name} to unlock "${tier.titleRewardName}"`, {
                              description: 'Verified patrons receive permanent holographic lobby flairs & dossier badges.',
                            });
                          }
                        }}
                        className={`w-full py-2.5 rounded-xl font-mono text-[11px] font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                          isEquipped
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                            : isUnlocked
                            ? 'bg-white/[0.08] border-white/20 text-white hover:bg-white/[0.14]'
                            : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:border-white/15'
                        }`}
                      >
                        {isEquipped ? (
                          <>
                            <Check size={13} strokeWidth={3} /> TITLE EQUIPPED
                          </>
                        ) : isUnlocked ? (
                          <>
                            <Sparkles size={13} style={{ color: `rgb(${gp})` }} /> EQUIP TITLE
                          </>
                        ) : (
                          <>
                            <Lock size={12} className="text-zinc-500" /> LOCKED • BACK TO UNLOCK
                          </>
                        )}
                      </button>
                    </div>
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
                const isReached = liveGoalTotal >= m.amount;
                return (
                  <div key={idx} className="relative z-10 flex sm:flex-col items-center gap-4 sm:gap-4 pl-4 sm:pl-0">
                    <div
                      className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all bg-[#07090e] shadow-xl relative ${
                        isReached ? 'border-transparent text-black' : 'border-white/10 text-zinc-500'
                      }`}
                      style={isReached ? { backgroundColor: `rgb(${gp})`, boxShadow: `0 0 20px rgba(${gp}, 0.3)` } : {}}
                    >
                      {getMilestoneIcon(idx)}
                    </div>
                    <div className="sm:text-center pt-1 sm:pt-0">
                      <div className="font-mono text-sm font-bold text-white">${m.amount}</div>
                      <div className="text-xs text-zinc-400 font-medium mt-1">{m.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3 Core Transparency Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 border"
                  style={{ backgroundColor: `rgba(${gp}, 0.08)`, borderColor: `rgba(${gp}, 0.2)`, color: `rgb(${gp})` }}
                >
                  <Server size={20} />
                </div>
                <h4 className="font-black text-white text-base mb-1.5">Cloud &amp; Netplay Infra</h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                  Sustains high-availability PostgreSQL databases, global low-latency Cloudflare edge CDN, and high-frequency WebSocket netplay relays.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 border"
                  style={{ backgroundColor: `rgba(${gp}, 0.08)`, borderColor: `rgba(${gp}, 0.2)`, color: `rgb(${gp})` }}
                >
                  <ShieldCheck size={20} />
                </div>
                <h4 className="font-black text-white text-base mb-1.5">100% Libre &amp; Ad-Free</h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                  Guarantees zero commercial ads, zero third-party telemetry scripts, and zero paywalled typing features. Open-source under GPL v3.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 border"
                  style={{ backgroundColor: `rgba(${gp}, 0.08)`, borderColor: `rgba(${gp}, 0.2)`, color: `rgb(${gp})` }}
                >
                  <GraduationCap size={20} />
                </div>
                <h4 className="font-black text-white text-base mb-1.5">Independent Solo Creator</h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                  Directly supports a solo independent developer, enabling active full-time engineering of TypeNova without ads, investors, or paywalls.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 7 - Patron Wall */}
        <motion.div
          id="patron-wall"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
          className="py-14 sm:py-20 border-t border-white/[0.06]"
        >
          {/* Section Header with Eyebrow, Title & Minimalist Control Bar */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6">
            <div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono tracking-[0.2em] uppercase font-bold border mb-3 backdrop-blur-md"
                style={{ borderColor: `rgba(${gp}, 0.25)`, backgroundColor: `rgba(${gp}, 0.08)`, color: `rgb(${gp})` }}
              >
                <Sparkles size={11} /> IMMUTABLE ARCHIVAL LEDGER
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                Community Supporters
                <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full border border-white/10 bg-white/[0.04] text-zinc-400">
                  {combinedPatrons.length} Backers
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 font-mono mt-1.5 max-w-xl leading-relaxed">
                Verified operators and patrons directly underwriting TypeNova&apos;s independent, ad-free engineering.
              </p>
            </div>

            {/* Minimalist Control Bar (Adheres to GEMINI.md: single-row flex, dot dividers, tight gaps) */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Micro Metrics Strip */}
              <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase text-zinc-500 tracking-wider">TOTAL</span>
                  <span className="font-bold text-white font-mono">${wallMetrics.totalUsd}</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase text-zinc-500 tracking-wider">APEX</span>
                  <span className="font-bold font-mono" style={{ color: `rgb(${gp})` }}>${wallMetrics.apexUsd}</span>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/10 backdrop-blur-md">
                {(['all', 'top', 'recent'] as WallFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setWallFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold capitalize transition-all cursor-pointer ${
                      wallFilter === f
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    style={wallFilter === f ? { color: `rgb(${gp})` } : {}}
                  >
                    {f === 'all' ? 'All Backers' : f === 'top' ? 'Apex First' : 'Recent'}
                  </button>
                ))}
              </div>

              {/* Clear records button if user has local entries */}
              {hasLocalPatrons && (
                <button
                  onClick={handleClearAllMyRecords}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-zinc-400 hover:text-rose-400 bg-white/[0.03] hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Remove all my records from this wall"
                >
                  <Trash2 size={12} /> CLEAR MY RECORDS
                </button>
              )}
            </div>
          </div>

          {combinedPatrons.length === 0 ? (
            <div className="p-10 sm:p-14 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl max-w-xl mx-auto">
              <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/10 mx-auto flex items-center justify-center mb-5 text-zinc-400">
                <Heart size={24} style={{ color: `rgb(${gp})` }} />
              </div>
              <h3 className="text-xl font-black text-white mb-2">The Wall Awaits Its First Backer</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6 font-mono max-w-md mx-auto">
                No patrons recorded on the live ledger yet. Be the founding supporter to back TypeNova and permanently engrave your callsign at the apex!
              </p>
              <button
                onClick={() => {
                  const terminal = document.getElementById('payment-terminal');
                  if (terminal) terminal.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-8 py-3 rounded-full font-mono text-xs font-bold text-black hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-[0_0_25px_rgba(255,255,255,0.1)]"
                style={{ backgroundColor: `rgb(${gp})` }}
              >
                BECOME FOUNDING PATRON &rarr;
              </button>
            </div>
          ) : (
            <>
              {/* Asymmetric Bento Architectural Ledger */}
              {(() => {
                const leadPatron = combinedPatrons[0];
                const secondaryPatrons = combinedPatrons.slice(1, 3);
                const remainingPatrons = combinedPatrons.slice(3);

                const leadUsd = convertCurrency(leadPatron.amount, leadPatron.currency || 'USD', 'USD');
                const isLeadCelestial = leadUsd >= 50 || leadPatron.tierId === 'tier_legend';
                const isLeadArchitect = !isLeadCelestial && (leadUsd >= 25 || leadPatron.tierId === 'tier_scholar');
                const leadDisplayName = (leadPatron.name || 'Anonymous Patron').trim() || 'Anonymous Patron';
                const leadAvatarStyle = getAvatarStyle(leadDisplayName, isLeadCelestial, isLeadArchitect, gp);
                const isLeadMyRecord = Boolean(
                  effectiveUserName &&
                  leadPatron.name.toLowerCase() === effectiveUserName.toLowerCase()
                );
                const leadPlatform = getPlatformMeta(leadPatron.platform);
                const LeadPlatformIcon = leadPlatform.icon;

                return (
                  <div className="space-y-4 sm:space-y-5">
                    {/* Top Bento Level: Flagship Lead + Companion Spotlights */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
                      {/* Flagship Hero Card */}
                      <div
                        className={`relative rounded-3xl p-px overflow-hidden group transition-all duration-500 flex flex-col ${
                          secondaryPatrons.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'
                        }`}
                      >
                        {/* Dynamic theme hairline border */}
                        <div
                          className="absolute inset-0 rounded-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none"
                          style={{
                            background: `linear-gradient(135deg, rgba(${gp}, 0.45) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(${gp}, 0.2) 100%)`,
                          }}
                        />

                        {/* Ambient background bloom */}
                        <div
                          className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-[100px] pointer-events-none opacity-20 group-hover:opacity-30 transition-opacity duration-700"
                          style={{ backgroundColor: `rgb(${gp})` }}
                        />

                        <div className="relative rounded-[calc(1.5rem-1px)] bg-[#090b10]/95 backdrop-blur-3xl p-6 sm:p-8 lg:p-9 flex flex-col justify-between h-full border border-white/[0.04] shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.06)]">
                          <div>
                            {/* Top Tier & Verification Header */}
                            <div className="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-white/[0.06]">
                              <div className="flex items-center gap-2">
                                <div
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-black tracking-[0.16em] uppercase border shadow-sm backdrop-blur-md"
                                  style={{
                                    borderColor: `rgba(${gp}, 0.35)`,
                                    backgroundColor: `rgba(${gp}, 0.1)`,
                                    color: `rgb(${gp})`,
                                    boxShadow: `0 0 16px rgba(${gp}, 0.15)`,
                                  }}
                                >
                                  {isLeadCelestial ? <Crown size={12} /> : <Sparkles size={11} />}
                                  <span>{isLeadCelestial ? 'SOVEREIGN APEX PATRON' : 'CHIEF ARCHITECT'}</span>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-500 tracking-wider hidden sm:inline">
                                  INDEX // #0001
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono tracking-wider uppercase bg-white/[0.04] border border-white/[0.08] text-zinc-300 flex items-center gap-1.5">
                                  <LeadPlatformIcon size={11} style={{ color: `rgb(${gp})` }} />
                                  <span>{leadPlatform.label}</span>
                                </span>
                                {isLeadMyRecord && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider text-emerald-400 bg-emerald-500/15 border border-emerald-500/30">
                                    YOU
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Patron Identity & Accredited Amount */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-4 min-w-0">
                                <div
                                  className="w-14 h-14 rounded-2xl flex items-center justify-center font-mono font-black text-xl shrink-0 border shadow-lg transition-transform duration-300 group-hover:scale-105"
                                  style={leadAvatarStyle}
                                >
                                  {leadDisplayName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate flex items-center gap-2">
                                    {leadDisplayName}
                                  </h3>
                                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mt-1">
                                    <ShieldCheck size={13} className="text-emerald-400" />
                                    <span className="text-zinc-300">Cryptographically Verified</span>
                                    <span className="text-zinc-600">•</span>
                                    <span>{new Date(leadPatron.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="sm:text-right shrink-0">
                                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 block">
                                  ACCREDITED SUSTENANCE
                                </span>
                                <div
                                  className="text-3xl sm:text-4xl lg:text-5xl font-mono font-black tracking-tight mt-0.5"
                                  style={{ color: `rgb(${gp})`, textShadow: `0 0 35px rgba(${gp}, 0.35)` }}
                                >
                                  {leadPatron.currency ? formatCurrency(leadPatron.amount, leadPatron.currency) : `$${leadPatron.amount}`}
                                </div>
                              </div>
                            </div>

                            {/* Inscription or Verified Proof Block */}
                            <div className="my-6">
                              {leadPatron.message ? (
                                <div
                                  className="relative pl-5 py-2.5 rounded-r-xl bg-white/[0.015] border"
                                  style={{
                                    borderLeftWidth: '3px',
                                    borderLeftColor: `rgb(${gp})`,
                                    borderTopColor: 'rgba(255,255,255,0.03)',
                                    borderRightColor: 'rgba(255,255,255,0.03)',
                                    borderBottomColor: 'rgba(255,255,255,0.03)',
                                  }}
                                >
                                  <Quote
                                    size={16}
                                    className="shrink-0 mb-1 opacity-80"
                                    style={{ color: `rgb(${gp})` }}
                                  />
                                  <p className="text-sm sm:text-base font-serif italic text-zinc-200 leading-relaxed break-words">
                                    &ldquo;{leadPatron.message}&rdquo;
                                  </p>
                                </div>
                              ) : (
                                <div className="p-4 rounded-xl bg-white/[0.015] border border-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-zinc-400">
                                  <div className="flex items-center gap-2">
                                    <Sparkles size={13} style={{ color: `rgb(${gp})` }} />
                                    <span>Founding sovereign underwriter of TypeNova netplay core.</span>
                                  </div>
                                  <span className="text-[10px] text-zinc-500 tracking-wider">
                                    TX HASH // #{leadPatron.txHash ? leadPatron.txHash.slice(0, 10).toUpperCase() : `REC-0001`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Footer Action Strip */}
                          <div className="flex items-center justify-between gap-3 pt-5 border-t border-white/[0.06]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCertificateData({
                                  callsign: leadDisplayName,
                                  amount: leadPatron.amount,
                                  currency: leadPatron.currency || 'USD',
                                  tierId: leadPatron.tierId,
                                  txHash: leadPatron.txHash,
                                  isOwner: isLeadMyRecord,
                                });
                                setIsCertificateOpen(true);
                              }}
                              className="group/btn inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-white bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-white/20 transition-all cursor-pointer shadow-sm"
                            >
                              <Award size={14} style={{ color: `rgb(${gp})` }} className="group-hover/btn:rotate-12 transition-transform" />
                              <span>INSPECT OFFICIAL ACCREDITATION</span>
                              <ArrowUpRight size={13} className="text-zinc-400 group-hover/btn:text-white group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                            </button>

                            {isLeadMyRecord && leadPatron.isLocal && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveSingleRecord(leadPatron);
                                }}
                                className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                                title="Remove this local record"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Companion Spotlights (Slots 1 & 2) */}
                      {secondaryPatrons.length > 0 && (
                        <div className="lg:col-span-5 flex flex-col gap-4 sm:gap-5 justify-between">
                          {secondaryPatrons.map((patron, sIdx) => {
                            const isMyRecord = Boolean(
                              effectiveUserName &&
                              patron.name.toLowerCase() === effectiveUserName.toLowerCase()
                            );
                            const usdAmount = convertCurrency(patron.amount, patron.currency || 'USD', 'USD');
                            const isCelestial = usdAmount >= 50 || patron.tierId === 'tier_legend';
                            const isArchitect = !isCelestial && (usdAmount >= 25 || patron.tierId === 'tier_scholar');
                            const displayName = (patron.name || 'Anonymous Patron').trim() || 'Anonymous Patron';
                            const avatarStyle = getAvatarStyle(displayName, isCelestial, isArchitect, gp);
                            const platformMeta = getPlatformMeta(patron.platform);
                            const PlatformIcon = platformMeta.icon;

                            return (
                              <div
                                key={`sec-${sIdx}`}
                                className="relative rounded-2xl p-px overflow-hidden group transition-all duration-300 flex-1 flex flex-col"
                              >
                                <div
                                  className="absolute inset-0 rounded-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none"
                                  style={{
                                    background: `linear-gradient(135deg, rgba(${gp}, 0.3) 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%)`,
                                  }}
                                />
                                <div className="relative rounded-[calc(1rem-1px)] bg-[#090b10]/95 backdrop-blur-2xl p-5 sm:p-6 flex flex-col justify-between h-full border border-white/[0.04] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                                  <div>
                                    <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-white/[0.06]">
                                      <div
                                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border"
                                        style={{
                                          borderColor: `rgba(${gp}, 0.25)`,
                                          backgroundColor: `rgba(${gp}, 0.07)`,
                                          color: `rgb(${gp})`,
                                        }}
                                      >
                                        <Sparkles size={10} />
                                        <span>{isCelestial ? 'CELESTIAL APEX' : 'HIGH ARCHITECT'}</span>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/5 text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                                          <PlatformIcon size={10} style={{ color: `rgb(${gp})` }} />
                                          <span>{platformMeta.label}</span>
                                        </span>
                                        {isMyRecord && (
                                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
                                            YOU
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div
                                          className="w-11 h-11 rounded-xl flex items-center justify-center font-mono font-bold text-base shrink-0 border transition-transform group-hover:scale-105"
                                          style={avatarStyle}
                                        >
                                          {displayName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="font-bold text-white text-base truncate flex items-center gap-1.5">
                                            {displayName}
                                          </div>
                                          <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                                            {new Date(patron.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="text-right shrink-0">
                                        <div
                                          className="font-mono font-black text-white text-xl tracking-tight"
                                          style={isCelestial ? { color: `rgb(${gp})` } : {}}
                                        >
                                          {patron.currency ? formatCurrency(patron.amount, patron.currency) : `$${patron.amount}`}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Quote / Inscription */}
                                    {patron.message ? (
                                      <div className="mt-3.5 pt-3 border-t border-white/[0.04]">
                                        <div className="relative rounded-xl p-2.5 bg-white/[0.02] border border-white/[0.03] flex items-start gap-2">
                                          <Quote size={11} className="shrink-0 mt-0.5" style={{ color: `rgba(${gp}, 0.7)` }} />
                                          <p className="text-xs text-zinc-300 font-mono italic leading-relaxed line-clamp-2">
                                            &ldquo;{patron.message}&rdquo;
                                          </p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="mt-3.5 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-zinc-500">
                                        <span className="flex items-center gap-1.5 text-zinc-400">
                                          <ShieldCheck size={11} className="text-emerald-400/80" />
                                          <span>Verified Ledger Record</span>
                                        </span>
                                        <span className="text-[10px] text-zinc-600">
                                          #{patron.txHash ? patron.txHash.slice(0, 8).toUpperCase() : `REC-000${sIdx + 2}`}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between pt-3.5 mt-3 border-t border-white/[0.05]">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCertificateData({
                                          callsign: displayName,
                                          amount: patron.amount,
                                          currency: patron.currency || 'USD',
                                          tierId: patron.tierId,
                                          txHash: patron.txHash,
                                          isOwner: isMyRecord,
                                        });
                                        setIsCertificateOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer group/sub"
                                    >
                                      <Award size={12} style={{ color: `rgb(${gp})` }} className="group-hover/sub:scale-110 transition-transform" />
                                      <span>Accreditation Certificate</span>
                                      <ArrowUpRight size={11} className="text-zinc-500 group-hover/sub:text-white" />
                                    </button>

                                    {isMyRecord && patron.isLocal && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveSingleRecord(patron);
                                        }}
                                        className="p-1 rounded text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                                        title="Remove this record"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Bottom Bento Matrix: Remaining Supporters */}
                    {remainingPatrons.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                        {remainingPatrons.map((patron, rIdx) => {
                          const isMyRecord = Boolean(
                            effectiveUserName &&
                            patron.name.toLowerCase() === effectiveUserName.toLowerCase()
                          );
                          const usdAmount = convertCurrency(patron.amount, patron.currency || 'USD', 'USD');
                          const isCelestial = usdAmount >= 50 || patron.tierId === 'tier_legend';
                          const isArchitect = !isCelestial && (usdAmount >= 25 || patron.tierId === 'tier_scholar');
                          const displayName = (patron.name || 'Anonymous Patron').trim() || 'Anonymous Patron';
                          const avatarStyle = getAvatarStyle(displayName, isCelestial, isArchitect, gp);
                          const platformMeta = getPlatformMeta(patron.platform);
                          const PlatformIcon = platformMeta.icon;

                          return (
                            <div
                              key={`rem-${rIdx}`}
                              className="rounded-2xl p-px bg-white/[0.06] hover:bg-white/[0.12] transition-all duration-300 flex flex-col group"
                            >
                              <div className="rounded-[calc(1rem-1px)] bg-[#090b10]/95 backdrop-blur-xl p-5 flex flex-col justify-between h-full border border-white/[0.03]">
                                <div>
                                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.05]">
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono text-zinc-400 border border-white/5 bg-white/[0.02]">
                                      <span>{isCelestial ? 'CELESTIAL' : isArchitect ? 'ARCHITECT' : 'PATRON'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/5 text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                                        <PlatformIcon size={10} style={{ color: `rgb(${gp})` }} />
                                        <span>{platformMeta.label}</span>
                                      </span>
                                      {isMyRecord && (
                                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
                                          YOU
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div
                                        className="w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm shrink-0 border transition-transform group-hover:scale-105"
                                        style={avatarStyle}
                                      >
                                        {displayName.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-bold text-white text-sm truncate">
                                          {displayName}
                                        </div>
                                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                          {new Date(patron.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <div className="font-mono font-bold text-white text-base tracking-tight">
                                        {patron.currency ? formatCurrency(patron.amount, patron.currency) : `$${patron.amount}`}
                                      </div>
                                    </div>
                                  </div>

                                  {patron.message ? (
                                    <div className="mt-3 pt-2.5 border-t border-white/[0.04]">
                                      <p className="text-xs text-zinc-400 font-mono italic leading-relaxed line-clamp-2">
                                        &ldquo;{patron.message}&rdquo;
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-zinc-500">
                                      <span className="text-zinc-400">Verified Archival Entry</span>
                                      <span>#{patron.txHash ? patron.txHash.slice(0, 8).toUpperCase() : `REC-${(rIdx + 4).toString().padStart(4, '0')}`}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/[0.04]">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCertificateData({
                                        callsign: displayName,
                                        amount: patron.amount,
                                        currency: patron.currency || 'USD',
                                        tierId: patron.tierId,
                                        txHash: patron.txHash,
                                        isOwner: isMyRecord,
                                      });
                                      setIsCertificateOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                  >
                                    <Award size={11} style={{ color: `rgb(${gp})` }} />
                                    <span>Certificate</span>
                                    <ArrowUpRight size={10} className="text-zinc-500" />
                                  </button>

                                  {isMyRecord && patron.isLocal && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveSingleRecord(patron);
                                      }}
                                      className="p-1 rounded text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                                      title="Remove record"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Archival Underwriting Callout & CTA */}
              <div className="mt-14 relative rounded-3xl p-px overflow-hidden bg-gradient-to-b from-white/[0.08] to-transparent">
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-48 rounded-full blur-[90px] opacity-15 pointer-events-none"
                  style={{ backgroundColor: `rgb(${gp})` }}
                />
                <div className="relative rounded-[calc(1.5rem-1px)] bg-[#090b10]/95 backdrop-blur-2xl p-8 sm:p-10 text-center flex flex-col items-center">
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-[0.2em] uppercase border mb-3"
                    style={{ borderColor: `rgba(${gp}, 0.3)`, backgroundColor: `rgba(${gp}, 0.08)`, color: `rgb(${gp})` }}
                  >
                    <Sparkles size={11} /> BECOME A SOVEREIGN PATRON
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Engrave Your Callsign in TypeNova Lore.
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 font-mono mt-2 max-w-lg leading-relaxed">
                    Underwrite independent, ad-free engineering. Backers instantly unlock holographic title rewards, digital certificates, and priority governance.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => {
                        const terminal = document.getElementById('payment-terminal');
                        if (terminal) terminal.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-full font-mono text-xs font-black tracking-wider uppercase text-black transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer overflow-hidden shadow-[0_0_30px_rgba(var(--glow-primary),0.35)]"
                      style={{ backgroundColor: `rgb(${gp})` }}
                    >
                      <span>JOIN THE IMMUTABLE LEDGER</span>
                      <span className="w-6 h-6 rounded-full bg-black/15 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                        <ArrowUpRight size={13} className="text-black" />
                      </span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 text-[11px] font-mono text-zinc-500 mt-4 flex-wrap justify-center">
                    <span>Instant Certificate Issuance</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>Holographic Callsign Titles</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>Cryptographic Archival Proof</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>

        {/* Section 7.5 - Community Feature Voting & Roadmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="py-14 sm:py-20 border-t border-white/[0.06]"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-6">
            <div>
              <div
                className="inline-flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.2em] uppercase mb-2"
                style={{ color: `rgb(${gp})` }}
              >
                <Sparkles size={14} /> TIER-3 &amp; TIER-4 GOVERNANCE
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                Prioritized Community Voting.
              </h2>
              <p className="text-xs text-zinc-400 font-mono mt-1 max-w-xl">
                Supporters steer the engineering roadmap. Cast your vote on upcoming engine capabilities or submit new proposals on GitHub Discussions.
              </p>
            </div>
            
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-white/25 transition-all flex items-center gap-2 shrink-0"
            >
              <span>SUBMIT PROPOSAL</span>
              <ExternalLink size={13} />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BACKER_ROADMAP_ITEMS.map((item) => {
              const hasVoted = votedFeatureIds.has(item.id);
              const voteCount = item.baseVotes + (hasVoted ? 1 : 0);

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl flex flex-col justify-between transition-all hover:border-white/15"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 uppercase">
                        {item.tag}
                      </span>
                      <span
                        className="text-[10px] font-mono font-bold flex items-center gap-1"
                        style={{ color: `rgba(${gp}, 0.9)` }}
                      >
                        <Sparkles size={11} /> {item.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-white text-base mb-1">{item.title}</h4>
                    <p className="text-xs text-zinc-400 font-mono leading-relaxed mb-4">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                    <div className="text-xs font-mono text-zinc-500">
                      <span className="text-white font-bold">{voteCount}</span> Backer Votes
                    </div>
                    <button
                      onClick={() => handleVoteFeature(item.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        hasVoted
                          ? 'border'
                          : 'bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/10'
                      }`}
                      style={hasVoted ? {
                        backgroundColor: `rgba(${gp}, 0.2)`,
                        color: `rgb(${gp})`,
                        borderColor: `rgba(${gp}, 0.45)`,
                        boxShadow: `0 0 12px rgba(${gp}, 0.25)`,
                      } : undefined}
                    >
                      <ThumbsUp size={12} />
                      <span>{hasVoted ? 'VOTED' : 'UPVOTE'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Section 7.6 - Celestial Benefactors Hall of Fame */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          className="py-14 sm:py-20 border-t border-white/[0.06]"
        >
          <div className="relative rounded-3xl p-px bg-gradient-to-b from-purple-500/40 via-amber-500/30 to-purple-500/10 overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.15)]">
            <div className="rounded-[calc(1.5rem-1px)] bg-[#07090f]/95 p-8 sm:p-12 backdrop-blur-2xl text-center relative">
              <div
                className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-6"
                style={{
                  backgroundColor: `rgba(${gp}, 0.1)`,
                  border: `1px solid rgba(${gp}, 0.3)`,
                  boxShadow: `0 0 25px rgba(${gp}, 0.25)`,
                }}
              >
                <Crown size={28} style={{ color: `rgb(${gp})` }} />
              </div>

              <div
                className="inline-flex items-center gap-2 text-[10px] font-mono font-black tracking-[0.25em] uppercase mb-3 px-3 py-1 rounded-full"
                style={{
                  color: `rgb(${gp})`,
                  backgroundColor: `rgba(${gp}, 0.1)`,
                  border: `1px solid rgba(${gp}, 0.2)`,
                }}
              >
                ✦ PERPETUAL ARCHIVE ✦
              </div>

              <h3 className="text-2xl sm:text-4xl font-black text-white mb-4 tracking-tight">
                Celestial Benefactors Hall of Fame
              </h3>

              <p className="text-xs sm:text-sm text-zinc-300 font-mono leading-relaxed max-w-2xl mx-auto mb-8">
                &ldquo;Engraved into TypeNova lore for eternity. These sovereign patrons anchored the engine&apos;s open-source compute, immortalizing high-tick multiplayer relays and zero-commercial independence.&rdquo;
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 max-w-3xl mx-auto">
                {celestialBenefactors.map((ben, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-950/40 via-amber-950/30 to-purple-950/40 border shadow-[0_0_15px_rgba(0,0,0,0.2)] flex items-center gap-2.5"
                    style={{ borderColor: `rgba(${gp}, 0.35)` }}
                  >
                    <Crown size={13} style={{ color: `rgb(${gp})` }} className="shrink-0" />
                    <span className="font-mono font-black text-xs text-white tracking-wider">
                      {ben.name}
                    </span>
                    <span
                      className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded"
                      style={{
                        backgroundColor: `rgba(${gp}, 0.15)`,
                        color: `rgb(${gp})`,
                        border: `1px solid rgba(${gp}, 0.3)`,
                      }}
                    >
                      {ben.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
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
                <h4 className="font-bold text-white mb-1">Solo Independent Developer</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">Built and maintained by a solo independent creator. 100% focused on software craft.</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500">
            <div className="flex items-center gap-2">
              <Heart size={14} className="text-rose-500 shrink-0" /> Every contribution keeps TypeNova independent and ad-free.
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
        tierId={selectedTierId}
        userId={auth.user?.id || null}
        userCallsign={effectiveUserName || null}
        onPaymentSuccess={handlePaymentSuccess}
        onOpenCertificate={(data) => {
          setCertificateData({
            callsign: data.name || effectiveUserName || 'Benefactor',
            amount: data.amount,
            currency: data.currency,
            tierId: data.tierId || selectedTierId,
            txHash: data.txHash,
            isOwner: true,
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
        tierId={certificateData.tierId}
        txHash={certificateData.txHash}
        isOwner={certificateData.isOwner}
        userRecords={certificateData.userRecords}
      />

      <CurrencyPickerModal
        isOpen={isCurrencyPickerOpen}
        onClose={() => setIsCurrencyPickerOpen(false)}
        selectedCurrency={selectedCurrency}
        onSelectCurrency={handleCurrencyChange}
        theme={theme}
      />

    </div>
  );
};