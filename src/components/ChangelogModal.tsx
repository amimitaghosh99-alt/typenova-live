import { useState, useRef, useEffect, useMemo, memo, useCallback } from 'react';
import { 
  X, 
  Sparkles, 
  Bug, 
  Zap, 
  Wrench, 
  Bell, 
  Search, 
  GitCommit, 
  Check, 
  Layers,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Rocket,
  Mail,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { CHANGELOG } from '@/data/changelog';
import type { Theme } from '@/data/constants';

interface ChangelogModalProps {
  theme: Theme;
  onClose: () => void;
}

type FilterType = 'all' | 'feature' | 'perf' | 'fix';

const getIconForType = (type: string) => {
  switch (type) {
    case 'feature': return <Sparkles size={15} className="text-cyan-400 shrink-0" />;
    case 'fix': return <Bug size={15} className="text-rose-400 shrink-0" />;
    case 'perf': return <Zap size={15} className="text-amber-400 shrink-0" />;
    case 'tweak': return <Wrench size={15} className="text-sky-400 shrink-0" />;
    default: return <Sparkles size={15} className="text-zinc-400 shrink-0" />;
  }
};

const getTypeBadge = (type: string) => {
  switch (type) {
    case 'feature':
      return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 uppercase">FEATURE</span>;
    case 'fix':
      return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300 uppercase">FIX</span>;
    case 'perf':
      return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 uppercase">PERF</span>;
    case 'tweak':
      return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/15 border border-sky-500/30 text-sky-300 uppercase">TWEAK</span>;
    default:
      return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 border border-zinc-700 text-zinc-300 uppercase">NOTE</span>;
  }
};

export const ChangelogModal = memo(function ChangelogModal({ theme, onClose }: ChangelogModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [selectedVersion, setSelectedVersion] = useState<string>(CHANGELOG[0]?.version || '');
  const [subscribed, setSubscribed] = useState(() => {
    return localStorage.getItem('typenova_changelog_subscribed') === 'true';
  });
  const [subscribeEmail, setSubscribeEmail] = useState(() => {
    return localStorage.getItem('typenova_changelog_email') || '';
  });
  const [showSubscribeDialog, setShowSubscribeDialog] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });
  const [isClosing, setIsClosing] = useState(false);

  const sidebarButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const sidebarContainerRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Filter releases by search query
  const filteredReleases = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return CHANGELOG;

    return CHANGELOG.filter((release) => {
      const matchesTitle = release.title.toLowerCase().includes(query);
      const matchesVersion = release.version.toLowerCase().includes(query);
      const matchesChange = release.changes.some((c) => c.description.toLowerCase().includes(query));
      return matchesTitle || matchesVersion || matchesChange;
    });
  }, [searchQuery]);

  // Keep selected version valid when filtering
  useEffect(() => {
    if (filteredReleases.length > 0) {
      const exists = filteredReleases.some((r) => r.version === selectedVersion);
      if (!exists) {
        setSelectedVersion(filteredReleases[0].version);
      }
    }
  }, [filteredReleases, selectedVersion]);

  // Selected release data
  const currentRelease = useMemo(() => {
    return CHANGELOG.find((r) => r.version === selectedVersion) || CHANGELOG[0];
  }, [selectedVersion]);

  const currentIndex = useMemo(() => {
    return CHANGELOG.findIndex((r) => r.version === selectedVersion);
  }, [selectedVersion]);

  const prevRelease = currentIndex < CHANGELOG.length - 1 ? CHANGELOG[currentIndex + 1] : null;
  const nextRelease = currentIndex > 0 ? CHANGELOG[currentIndex - 1] : null;

  // Filtered changes for the active release
  const activeChanges = useMemo(() => {
    if (!currentRelease) return [];
    const query = searchQuery.trim().toLowerCase();
    return currentRelease.changes.filter((c) => {
      const matchesType = selectedFilter === 'all' || c.type === selectedFilter;
      const matchesQuery = !query || c.description.toLowerCase().includes(query);
      return matchesType && matchesQuery;
    });
  }, [currentRelease, selectedFilter, searchQuery]);

  // Counts for filter pills
  const counts = useMemo(() => {
    if (!currentRelease) return { all: 0, feature: 0, perf: 0, fix: 0 };
    return {
      all: currentRelease.changes.length,
      feature: currentRelease.changes.filter((c) => c.type === 'feature').length,
      perf: currentRelease.changes.filter((c) => c.type === 'perf').length,
      fix: currentRelease.changes.filter((c) => c.type === 'fix').length,
    };
  }, [currentRelease]);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 180);
  }, [isClosing, onClose]);

  // Handle Browser Push Notifications
  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications are not supported on this device.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushEnabled(true);
        setSubscribed(true);
        localStorage.setItem('typenova_changelog_subscribed', 'true');
        
        try {
          new Notification('TypeNova Release Alerts 🚀', {
            body: 'You are now subscribed! You will receive instant notifications when major builds go live.',
            icon: '/favicon.ico',
          });
        } catch {
          // Ignored if service worker push is required
        }
        toast.success('Desktop notifications enabled!', { icon: '🔔' });
      } else {
        toast.error('Notification permission was denied in browser settings.');
      }
    } catch {
      toast.error('Could not request notification permissions.');
    }
  };

  // Quick Subscribe / Unsubscribe Toggle
  const handleQuickSubscribeToggle = () => {
    if (subscribed) {
      setSubscribed(false);
      localStorage.setItem('typenova_changelog_subscribed', 'false');
      toast.info('Unsubscribed from release notifications.');
    } else {
      setSubscribed(true);
      localStorage.setItem('typenova_changelog_subscribed', 'true');
      toast.success('Subscribed to TypeNova update alerts!', { icon: '🔔' });
      if ('Notification' in window && Notification.permission !== 'granted') {
        requestPushPermission();
      }
    }
  };

  const handleSaveEmailSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    const email = subscribeEmail.trim();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    localStorage.setItem('typenova_changelog_email', email);
    localStorage.setItem('typenova_changelog_subscribed', 'true');
    setSubscribed(true);
    setShowSubscribeDialog(false);
    toast.success(`Subscribed ${email} to release dispatches!`, { icon: '📬' });
  };

  const selectRelease = useCallback((version: string) => {
    setSelectedVersion(version);
    const btn = sidebarButtonRefs.current[version];
    const container = sidebarContainerRef.current;
    if (btn && container) {
      const btnRect = btn.getBoundingClientRect();
      const contRect = container.getBoundingClientRect();
      if (btnRect.top < contRect.top || btnRect.bottom > contRect.bottom) {
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, []);

  const primaryRgb = theme.glowPrimary || '6, 182, 212';
  const isLatest = selectedVersion === CHANGELOG[0]?.version;

  return (
    <div 
      className={`fixed inset-0 z-[500] flex items-center justify-center bg-black/90 p-3 sm:p-6 overflow-hidden overscroll-none transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      <div 
        className={`relative w-full max-w-4xl h-[85vh] max-h-[780px] flex flex-col rounded-3xl border border-white/15 shadow-2xl overflow-hidden bg-[#09090b] ${
          isClosing ? 'lucid-scale-exit' : 'lucid-scale'
        }`}
        style={{
          boxShadow: `0 25px 60px -15px rgba(0,0,0,0.95), 0 0 40px rgba(${primaryRgb}, 0.15)`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <div className="relative z-10 shrink-0 p-4 sm:p-5 pb-4 border-b border-white/10 bg-[#0d0d12]">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm"
                style={{
                  borderColor: `rgba(${primaryRgb}, 0.5)`,
                  backgroundColor: `rgba(${primaryRgb}, 0.15)`,
                  boxShadow: `0 0 20px rgba(${primaryRgb}, 0.25)`
                }}
              >
                <Rocket style={{ color: `rgb(${primaryRgb})` }} size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold font-mono text-white tracking-tight">
                    Update Log
                  </h2>
                  <span 
                    className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 shadow-sm"
                    style={{
                      borderColor: `rgba(${primaryRgb}, 0.45)`,
                      backgroundColor: `rgba(${primaryRgb}, 0.16)`,
                      color: `rgb(${primaryRgb})`,
                      boxShadow: `0 0 12px rgba(${primaryRgb}, 0.2)`
                    }}
                  >
                    <span 
                      className="w-1.5 h-1.5 rounded-full animate-ping"
                      style={{ backgroundColor: `rgb(${primaryRgb})` }}
                    />
                    {CHANGELOG[0]?.version} LATEST
                  </span>
                </div>
                <p className="text-xs font-mono text-zinc-400">
                  Interactive Release History & Engineering Notes
                </p>
              </div>
            </div>

            {/* Controls: Subscribe & Close */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSubscribeDialog(true)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all border cursor-pointer ${
                  subscribed
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                    : 'bg-white/5 hover:bg-white/10 border-white/15 text-zinc-300 hover:text-white hover:scale-105 active:scale-95'
                }`}
                style={!subscribed ? { borderColor: `rgba(${primaryRgb}, 0.35)` } : undefined}
                title="Manage release update notifications"
              >
                {subscribed ? (
                  <>
                    <Check size={13} className="text-emerald-400" />
                    <span>Subscribed</span>
                  </>
                ) : (
                  <>
                    <Bell size={13} style={{ color: `rgb(${primaryRgb})` }} />
                    <span>Subscribe</span>
                  </>
                )}
              </button>

              <button
                onClick={handleClose}
                className="p-2 bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white rounded-full transition-all hover:rotate-90 cursor-pointer active:scale-95"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Search Input Strip */}
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across all releases, features, bug fixes..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#14141c] border border-white/10 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none transition-all"
              style={{
                borderColor: searchQuery ? `rgba(${primaryRgb}, 0.6)` : undefined,
                boxShadow: searchQuery ? `0 0 14px rgba(${primaryRgb}, 0.25)` : undefined,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── BODY (SIDEBAR RAIL + ACTIVE RELEASE SHOWCASE) ─────────────────── */}
        <div className="relative z-10 flex-1 flex overflow-hidden min-h-0 w-full bg-[#09090b]">
          
          {/* Left Vertical Release Rail */}
          <div 
            ref={sidebarContainerRef}
            className="w-44 sm:w-52 shrink-0 border-r border-white/10 bg-[#0c0c12] p-2.5 overflow-y-auto h-full custom-scrollbar overscroll-contain"
          >
            <div className="flex items-center justify-between px-2 py-1 mb-2 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 border-b border-white/5">
              <div className="flex items-center gap-1.5">
                <Layers size={12} style={{ color: `rgb(${primaryRgb})` }} />
                <span>Versions</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/5 text-zinc-400">
                {filteredReleases.length}
              </span>
            </div>

            <div className="space-y-1 relative">
              {filteredReleases.map((entry, idx) => {
                const isActive = selectedVersion === entry.version;
                const isLatestEntry = idx === 0 && !searchQuery;

                return (
                  <motion.button
                    key={entry.version}
                    ref={(el) => { sidebarButtonRefs.current[entry.version] = el; }}
                    onClick={() => selectRelease(entry.version)}
                    whileTap={{ scale: 0.98 }}
                    className={`relative w-full flex flex-col gap-0.5 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'text-white font-bold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeSidebarVersionPill"
                        className="absolute inset-0 rounded-xl border"
                        style={{
                          backgroundColor: `rgba(${primaryRgb}, 0.16)`,
                          borderColor: `rgba(${primaryRgb}, 0.5)`,
                          boxShadow: `0 0 16px rgba(${primaryRgb}, 0.22)`,
                        }}
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      />
                    )}
                    <div className="relative z-10 flex items-center justify-between w-full">
                      <span 
                        className={`text-xs font-mono ${isActive ? 'font-black' : 'font-bold'}`}
                        style={isActive ? { color: `rgb(${primaryRgb})` } : undefined}
                      >
                        {entry.version}
                      </span>
                      {isLatestEntry && (
                        <span 
                          className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-full border"
                          style={{
                            backgroundColor: `rgba(${primaryRgb}, 0.2)`,
                            borderColor: `rgba(${primaryRgb}, 0.45)`,
                            color: `rgb(${primaryRgb})`,
                          }}
                        >
                          LATEST
                        </span>
                      )}
                    </div>
                    <span className="relative z-10 text-[10px] font-mono text-zinc-400 truncate">
                      {entry.date.split(',')[0]}
                    </span>
                    <div className="relative z-10 flex items-center gap-2 mt-0.5 text-[9px] font-mono text-zinc-500">
                      <span>{entry.changes.length} updates</span>
                      {entry.impact.fixes > 0 && <span className="text-rose-400 font-bold bg-rose-500/10 px-1 py-0.2 rounded">+{entry.impact.fixes} fix</span>}
                    </div>
                  </motion.button>
                );
              })}

              {filteredReleases.length === 0 && (
                <div className="p-4 text-center text-xs font-mono text-zinc-500">
                  No releases found
                </div>
              )}
            </div>
          </div>

          {/* Right Main Detail Stage */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-12 space-y-5 custom-scrollbar h-full overscroll-contain bg-[#09090b]">
            <AnimatePresence>
              {currentRelease && (
                <motion.div
                  key={currentRelease.version}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="space-y-5"
                >
                  {/* Hero Release Card */}
                  <div 
                    className="p-5 sm:p-6 rounded-2xl border transition-all bg-[#121218]"
                    style={{
                      borderColor: `rgba(${primaryRgb}, 0.45)`,
                      boxShadow: `0 0 35px -5px rgba(${primaryRgb}, 0.2), inset 0 1px 0 rgba(${primaryRgb}, 0.35)`
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl sm:text-3xl font-mono font-black tracking-tight text-white">
                          {currentRelease.version}
                        </span>
                        {isLatest && (
                          <span 
                            className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border shadow-sm"
                            style={{
                              borderColor: `rgba(${primaryRgb}, 0.5)`,
                              backgroundColor: `rgba(${primaryRgb}, 0.2)`,
                              color: `rgb(${primaryRgb})`,
                              boxShadow: `0 0 12px rgba(${primaryRgb}, 0.25)`
                            }}
                          >
                            CURRENT RELEASE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-200 bg-white/[0.08] border border-white/15 px-3 py-1 rounded-full shadow-sm">
                        <Calendar size={13} className="text-zinc-300" />
                        <span>{currentRelease.date}</span>
                      </div>
                    </div>

                    <h3 className="text-base sm:text-lg font-mono font-bold text-white leading-snug mt-2.5">
                      {currentRelease.title}
                    </h3>

                    {/* Impact Metric Chips */}
                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/10">
                      {currentRelease.impact.fixes > 0 && (
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-300 bg-rose-500/15 border border-rose-500/35 px-2.5 py-1 rounded-lg">
                          <Bug size={13} className="text-rose-400" />
                          <span>{currentRelease.impact.fixes} {currentRelease.impact.fixes === 1 ? 'Fix' : 'Fixes'}</span>
                        </div>
                      )}
                      {currentRelease.impact.tweaks > 0 && (
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-sky-300 bg-sky-500/15 border border-sky-500/35 px-2.5 py-1 rounded-lg">
                          <Wrench size={13} className="text-sky-400" />
                          <span>{currentRelease.impact.tweaks} Tweaks</span>
                        </div>
                      )}
                      {currentRelease.impact.linesChanged > 0 && (
                        <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-200 bg-white/[0.08] border border-white/15 px-2.5 py-1 rounded-lg">
                          <GitCommit size={13} className="text-zinc-300" />
                          <span>+{currentRelease.impact.linesChanged} lines</span>
                        </div>
                      )}
                      {currentRelease.impact.perfGain && (
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/35 px-2.5 py-1 rounded-lg">
                          <Zap size={13} className="text-amber-400" />
                          <span>{currentRelease.impact.perfGain}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Filter Pills with Fluid Framer Motion Spring Pill */}
                  <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-[#13131c] border border-white/10 overflow-x-auto custom-scrollbar">
                    {(['all', 'feature', 'perf', 'fix'] as FilterType[]).map((f) => {
                      const isActive = selectedFilter === f;
                      const count = counts[f];
                      const labels: Record<FilterType, string> = {
                        all: `ALL (${count})`,
                        feature: `✨ FEATURES (${counts.feature})`,
                        perf: `⚡ PERF (${counts.perf})`,
                        fix: `🛠️ FIXES (${counts.fix})`,
                      };

                      return (
                        <button
                          key={f}
                          onClick={() => setSelectedFilter(f)}
                          className={`relative px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-colors cursor-pointer ${
                            isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                          }`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="activeFilterPill"
                              className="absolute inset-0 rounded-xl border shadow-sm"
                              style={{
                                backgroundColor: `rgba(${primaryRgb}, 0.22)`,
                                borderColor: `rgba(${primaryRgb}, 0.55)`,
                                boxShadow: `0 0 16px rgba(${primaryRgb}, 0.28)`,
                              }}
                              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                            />
                          )}
                          <span className="relative z-10">{labels[f]}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Changes List */}
                  <motion.div layout className="space-y-2.5">
                    {activeChanges.map((change, idx) => (
                      <motion.div
                        key={`${currentRelease.version}-${idx}`}
                        layout
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                        className="group flex items-start gap-3 p-3.5 sm:p-4 rounded-xl bg-[#121218] hover:bg-[#181822] border border-white/10 hover:border-white/20 transition-all shadow-sm"
                      >
                        <div className="mt-0.5 shrink-0">
                          {getIconForType(change.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getTypeBadge(change.type)}
                          </div>
                          <p className="text-xs sm:text-sm font-mono text-zinc-100 leading-relaxed group-hover:text-white transition-colors">
                            {change.description}
                          </p>
                        </div>
                      </motion.div>
                    ))}

                    {activeChanges.length === 0 && (
                      <div className="p-8 text-center rounded-xl bg-[#121218] border border-white/10">
                        <p className="text-xs font-mono text-zinc-400">
                          No {selectedFilter !== 'all' ? selectedFilter : ''} entries in {currentRelease.version}.
                        </p>
                      </div>
                    )}
                  </motion.div>

                  {/* Prev / Next Version Footer Navigation */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/10 gap-3">
                    {prevRelease ? (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => selectRelease(prevRelease.version)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14141d] hover:bg-[#1c1c28] border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
                      >
                        <ChevronLeft size={15} />
                        <span>Older: {prevRelease.version}</span>
                      </motion.button>
                    ) : <div />}

                    {nextRelease ? (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => selectRelease(nextRelease.version)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14141d] hover:bg-[#1c1c28] border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
                      >
                        <span>Newer: {nextRelease.version}</span>
                        <ChevronRight size={15} />
                      </motion.button>
                    ) : <div />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* ── SUBSCRIPTION PREFERENCES DIALOG ────────────────────────────── */}
      <AnimatePresence>
        {showSubscribeDialog && (
          <div 
            className="fixed inset-0 z-[600] flex items-center justify-center bg-black/85 p-4"
            onClick={() => setShowSubscribeDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.16 }}
              className="relative w-full max-w-md bg-[#0c0c14] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center border"
                    style={{
                      borderColor: `rgba(${primaryRgb}, 0.4)`,
                      backgroundColor: `rgba(${primaryRgb}, 0.15)`,
                    }}
                  >
                    <Bell size={20} style={{ color: `rgb(${primaryRgb})` }} />
                  </div>
                  <div>
                    <h3 className="text-base font-mono font-bold text-white">Release Alerts</h3>
                    <p className="text-xs font-mono text-zinc-400">Get notified when new builds launch</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSubscribeDialog(false)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Status Pill */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#141420] border border-white/10">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${subscribed ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-zinc-600'}`} />
                  <span className="text-xs font-mono text-zinc-300">
                    Status: <strong className={subscribed ? 'text-emerald-400' : 'text-zinc-400'}>{subscribed ? 'SUBSCRIBED' : 'NOT SUBSCRIBED'}</strong>
                  </span>
                </div>
                <button
                  onClick={handleQuickSubscribeToggle}
                  className={`text-[11px] font-mono font-bold px-3 py-1 rounded-xl transition-all border cursor-pointer ${
                    subscribed 
                      ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30' 
                      : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/35'
                  }`}
                >
                  {subscribed ? 'Unsubscribe' : 'Quick Subscribe'}
                </button>
              </div>

              {/* Push Notifications Section */}
              <div className="p-4 rounded-2xl bg-[#141420] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={16} className="text-cyan-400" />
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white">Browser Push Alerts</h4>
                      <p className="text-[11px] font-mono text-zinc-400">Desktop alerts when a build goes live</p>
                    </div>
                  </div>
                  <button
                    onClick={requestPushPermission}
                    className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                      pushEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    }`}
                  >
                    {pushEnabled ? 'Active ✓' : 'Enable'}
                  </button>
                </div>
              </div>

              {/* Email Section */}
              <form onSubmit={handleSaveEmailSubscription} className="p-4 rounded-2xl bg-[#141420] border border-white/10 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Mail size={16} className="text-amber-400" />
                  <div>
                    <h4 className="text-xs font-mono font-bold text-white">Email Dispatch</h4>
                    <p className="text-[11px] font-mono text-zinc-400">Receive detailed patch notes via email</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={subscribeEmail}
                    onChange={(e) => setSubscribeEmail(e.target.value)}
                    placeholder="racer@typenova.app"
                    className="flex-1 px-3 py-2 rounded-xl bg-[#0c0c14] border border-white/15 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </form>

              {/* Done button */}
              <button
                onClick={() => setShowSubscribeDialog(false)}
                className="w-full py-2.5 rounded-2xl text-xs font-mono font-bold bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-all cursor-pointer"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});


