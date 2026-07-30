import React, { useState, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Bug, 
  Zap, 
  PenTool, 
  Search, 
  Bell, 
  TrendingUp, 
  GitCommit, 
  Wrench, 
  Check, 
  Layers,
  Activity
} from 'lucide-react';
import { CHANGELOG, type ImpactStats } from '@/data/changelog';
import type { Theme } from '@/data/constants';

interface ChangelogModalProps {
  theme: Theme;
  onClose: () => void;
}

export function ChangelogModal({ theme, onClose }: ChangelogModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [activeVersion, setActiveVersion] = useState<string>(CHANGELOG[0]?.version || '');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const releaseRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleSubscribeToggle = () => {
    const nextState = !subscribed;
    setSubscribed(nextState);
    setToastMessage(nextState ? 'Subscribed to changelog notifications!' : 'Unsubscribed from updates');
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'feature': return <Sparkles size={14} className="text-emerald-400" />;
      case 'fix': return <Bug size={14} className="text-rose-400" />;
      case 'perf': return <Zap size={14} className="text-amber-400" />;
      case 'tweak': return <Wrench size={14} className="text-sky-400" />;
      default: return <PenTool size={14} className="text-zinc-400" />;
    }
  };

  const getLabelForType = (type: string) => {
    switch (type) {
      case 'feature': return 'FEATURE';
      case 'fix': return 'BUG FIX';
      case 'perf': return 'PERFORMANCE';
      case 'tweak': return 'TWEAK';
      default: return 'UPDATE';
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'feature':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'fix':
        return 'bg-rose-500/10 border-rose-500/30 text-rose-400';
      case 'perf':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'tweak':
        return 'bg-sky-500/10 border-sky-500/30 text-sky-400';
      default:
        return 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400';
    }
  };

  // Real-time filtering across version, title, date, change description and categories
  const filteredLogs = CHANGELOG.filter((entry) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const versionMatch = entry.version.toLowerCase().includes(q);
    const titleMatch = entry.title.toLowerCase().includes(q);
    const dateMatch = entry.date.toLowerCase().includes(q);
    const changeMatch = entry.changes.some((c) => 
      c.description.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q) ||
      getLabelForType(c.type).toLowerCase().includes(q)
    );
    return versionMatch || titleMatch || dateMatch || changeMatch;
  });

  const scrollToRelease = (version: string) => {
    setActiveVersion(version);
    const element = releaseRefs.current[version];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderImpactBar = (impact?: ImpactStats) => {
    if (!impact) {
      return (
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-zinc-500">
          <Activity size={13} className="text-zinc-600" />
          <span>Standard Maintenance Release</span>
        </div>
      );
    }

    const fixes = impact.fixes ?? 0;
    const tweaks = impact.tweaks ?? 0;
    const linesChanged = impact.linesChanged ?? 0;
    const perfGain = impact.perfGain;

    const fixesWeight = fixes * 2;
    const tweaksWeight = tweaks * 1.5;
    const linesWeight = Math.min(Math.ceil(linesChanged / 100), 6);
    const perfWeight = perfGain ? 4 : 0;

    const totalWeight = fixesWeight + tweaksWeight + linesWeight + perfWeight;

    const fixesPct = totalWeight > 0 ? (fixesWeight / totalWeight) * 100 : 0;
    const tweaksPct = totalWeight > 0 ? (tweaksWeight / totalWeight) * 100 : 0;
    const linesPct = totalWeight > 0 ? (linesWeight / totalWeight) * 100 : 0;
    const perfPct = totalWeight > 0 ? (perfWeight / totalWeight) * 100 : 0;

    return (
      <div className="mt-5 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
            <Activity size={12} className="text-purple-400" />
            Release Impact
          </span>
          {perfGain && (
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <Zap size={11} /> {perfGain}
            </span>
          )}
        </div>

        {/* Metric Pills Row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
            <Bug size={13} className="text-rose-400" />
            <span>{fixes} {fixes === 1 ? 'Fix' : 'Fixes'}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-medium">
            <Wrench size={13} className="text-sky-400" />
            <span>{tweaks} {tweaks === 1 ? 'Tweak' : 'Tweaks'}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
            <GitCommit size={13} className="text-purple-400" />
            <span>+{linesChanged} Lines</span>
          </div>

          {perfGain && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
              <TrendingUp size={13} className="text-amber-400" />
              <span>{perfGain}</span>
            </div>
          )}
        </div>

        {/* Segmented Visual Bar */}
        <div className="h-2 w-full bg-zinc-950/80 rounded-full flex overflow-hidden p-0.5 gap-0.5 border border-white/10 shadow-inner">
          {fixesPct > 0 && (
            <div 
              style={{ width: `${fixesPct}%` }} 
              className="h-full bg-rose-500 rounded-sm shadow-[0_0_8px_rgba(244,63,94,0.5)] transition-all duration-500" 
              title={`Fixes: ${fixes}`}
            />
          )}
          {tweaksPct > 0 && (
            <div 
              style={{ width: `${tweaksPct}%` }} 
              className="h-full bg-sky-400 rounded-sm shadow-[0_0_8px_rgba(56,189,248,0.5)] transition-all duration-500" 
              title={`Tweaks: ${tweaks}`}
            />
          )}
          {linesPct > 0 && (
            <div 
              style={{ width: `${linesPct}%` }} 
              className="h-full bg-purple-500 rounded-sm shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-all duration-500" 
              title={`Lines Changed: ${linesChanged}`}
            />
          )}
          {perfPct > 0 && (
            <div 
              style={{ width: `${perfPct}%` }} 
              className="h-full bg-amber-400 rounded-sm shadow-[0_0_8px_rgba(251,191,36,0.5)] transition-all duration-500" 
              title={`Perf Gain: ${perfGain}`}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-xl p-3 sm:p-6 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="glass-panel relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-[2.5rem] bg-zinc-950/90 border border-white/10 shadow-2xl shadow-purple-950/40 overflow-hidden lucid-scale"
        style={{ '--delay': '0ms' } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Glow Backdrop */}
        <div 
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: `rgb(${theme.glowPrimary || '168, 85, 247'})` }}
        />
        <div 
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-15"
          style={{ background: `rgb(${theme.glowSecondary || '34, 211, 238'})` }}
        />

        {/* Modal Top Bar / Header Controls */}
        <div className="relative z-10 p-6 sm:p-8 pb-5 border-b border-white/10 bg-zinc-950/60 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/15 bg-white/5 shadow-lg"
                style={{ borderColor: `rgba(${theme.glowPrimary || '168,85,247'}, 0.4)` }}
              >
                <Sparkles className="text-purple-400 animate-pulse" size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-widest text-white">
                    Update Log
                  </h2>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300">
                    {CHANGELOG[0]?.version || 'v1.5.2'} LATEST
                  </span>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  TypeNova Release History & Technical Notes
                </p>
              </div>
            </div>

            {/* Top Right Controls: Subscribe & Close */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSubscribeToggle}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border shadow-lg ${
                  subscribed
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                    : 'bg-white/5 hover:bg-white/10 border-white/15 text-white hover:scale-105'
                }`}
                title="Subscribe to release notifications"
              >
                {subscribed ? (
                  <>
                    <Bell size={14} className="text-emerald-400 fill-emerald-400/20" />
                    <span>Subscribed</span>
                  </>
                ) : (
                  <>
                    <Bell size={14} className="text-purple-400" />
                    <span>Subscribe to Updates</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="p-2.5 bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white rounded-full transition-all hover:rotate-90"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Search Filter Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl pl-11 pr-10 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all backdrop-blur-md shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-all"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Active Search Toast Feedback */}
          {toastMessage && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-zinc-900/90 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300 z-50 flex items-center gap-2">
              <Check size={14} className="text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Body with Left Sidebar & Content List */}
        <div className="relative z-10 flex-1 flex overflow-hidden">
          {/* Left Vertical Timeline Sidebar Navigation */}
          <div className="hidden md:flex flex-col w-56 border-r border-white/10 bg-zinc-950/40 backdrop-blur-sm p-4 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-2 px-3 py-2 mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-white/5">
              <Layers size={12} className="text-purple-400" />
              <span>Releases Timeline</span>
            </div>

            <div className="relative space-y-1">
              {/* Sidebar Rail Line */}
              <div className="absolute top-3 bottom-3 left-4 w-0.5 bg-gradient-to-b from-purple-500/50 via-zinc-800 to-zinc-900" />

              {filteredLogs.map((entry) => {
                const isActive = activeVersion === entry.version;
                return (
                  <button
                    key={entry.version}
                    onClick={() => scrollToRelease(entry.version)}
                    className={`group relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                      isActive 
                        ? 'bg-purple-500/15 border border-purple-500/30 text-white shadow-lg shadow-purple-950/30' 
                        : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200 border border-transparent'
                    }`}
                  >
                    {/* Node Dot */}
                    <div className={`relative z-10 w-2.5 h-2.5 rounded-full transition-all shrink-0 ${
                      isActive 
                        ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)] scale-125' 
                        : 'bg-zinc-700 group-hover:bg-zinc-500'
                    }`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-mono font-bold truncate ${isActive ? 'text-purple-300' : ''}`}>
                          {entry.version}
                        </span>
                        {entry.version === CHANGELOG[0]?.version && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate font-sans">
                        {entry.date}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Main Scrollable Changelog List */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8 custom-scrollbar">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 mb-4">
                  <Search size={28} />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">No matching updates found</h3>
                <p className="text-xs text-zinc-400 max-w-sm">
                  Try searching for a different keyword, version number, or change category.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold hover:bg-purple-500/30 transition-all"
                >
                  Clear Search Query
                </button>
              </div>
            ) : (
              filteredLogs.map((release, i) => (
                <div 
                  key={release.version}
                  ref={(el) => { releaseRefs.current[release.version] = el; }}
                  className="relative group"
                >
                  {/* Timeline Card Wrapper */}
                  <div className="glass-panel relative rounded-3xl bg-zinc-900/50 border border-white/10 p-6 md:p-7 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-white/20 hover:bg-zinc-900/70">
                    
                    {/* Header of Release Card */}
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4 pb-4 border-b border-white/10">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`text-2xl font-black uppercase tracking-wider font-mono ${
                            i === 0 ? 'text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'text-white'
                          }`}>
                            {release.version}
                          </span>
                          <span className="text-xs font-bold text-zinc-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full font-mono">
                            {release.date}
                          </span>
                          {i === 0 && (
                            <span className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-2.5 py-0.5 rounded-full shadow-md shadow-purple-500/20">
                              LATEST RELEASE
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-zinc-200">
                          {release.title}
                        </h4>
                      </div>
                    </div>

                    {/* Change Items List */}
                    <div className="space-y-3.5">
                      {release.changes.map((change, j) => (
                        <div 
                          key={j} 
                          className="flex items-start gap-3.5 p-3 rounded-2xl bg-zinc-950/40 border border-white/5 hover:border-white/10 transition-all"
                        >
                          <div className="mt-0.5 shrink-0 p-1.5 rounded-xl bg-white/5 border border-white/10">
                            {getIconForType(change.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getTypeBadgeStyle(change.type)}`}>
                                {getLabelForType(change.type)}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                              {change.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Impact Section with Metric Pills & Segmented Visual Bar */}
                    {renderImpactBar(release.impact)}

                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

