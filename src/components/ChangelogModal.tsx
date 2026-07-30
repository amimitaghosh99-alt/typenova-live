import React, { useState, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Bug, 
  Zap, 
  PenTool, 
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
      case 'feature': return <Sparkles size={13} className="text-emerald-400" />;
      case 'fix': return <Bug size={13} className="text-rose-400" />;
      case 'perf': return <Zap size={13} className="text-amber-400" />;
      case 'tweak': return <Wrench size={13} className="text-sky-400" />;
      default: return <PenTool size={13} className="text-zinc-400" />;
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
        return 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
      case 'fix':
        return 'bg-rose-500/15 border-rose-400/40 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.2)]';
      case 'perf':
        return 'bg-amber-500/15 border-amber-400/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
      case 'tweak':
        return 'bg-sky-500/15 border-sky-400/40 text-sky-300 shadow-[0_0_10px_rgba(14,165,233,0.2)]';
      default:
        return 'bg-white/10 border-white/20 text-zinc-300';
    }
  };

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
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Activity size={12} className="text-zinc-500 animate-pulse" />
          <span>Standard Maintenance & Stability Release</span>
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
      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Activity size={12} className="text-cyan-400 animate-pulse" />
            Release Impact & Activity Metrics
          </span>
          {perfGain && (
            <span className="text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
              <Zap size={11} className="text-amber-400" /> {perfGain}
            </span>
          )}
        </div>

        {/* Metric Pills Row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {fixes > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 border border-rose-500/30 text-rose-300">
              <Bug size={11} className="text-rose-400" />
              <span>{fixes} {fixes === 1 ? 'Fix' : 'Fixes'}</span>
            </div>
          )}

          {tweaks > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 border border-sky-500/30 text-sky-300">
              <Wrench size={11} className="text-sky-400" />
              <span>{tweaks} {tweaks === 1 ? 'Tweak' : 'Tweaks'}</span>
            </div>
          )}

          {linesChanged > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
              <GitCommit size={11} className="text-cyan-400" />
              <span>+{linesChanged} Lines</span>
            </div>
          )}

          {perfGain && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <TrendingUp size={11} className="text-amber-400" />
              <span>{perfGain}</span>
            </div>
          )}
        </div>

        {/* Compact Energy Track Bar (h-1.5) */}
        <div className="h-1.5 w-full bg-slate-950/60 rounded-full flex items-center overflow-hidden p-0.5 gap-0.5 border border-white/10">
          {fixesPct > 0 && (
            <div 
              style={{ width: `${fixesPct}%` }} 
              className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)] transition-all duration-500" 
              title={`Fixes: ${fixes}`}
            />
          )}
          {tweaksPct > 0 && (
            <div 
              style={{ width: `${tweaksPct}%` }} 
              className="h-full bg-gradient-to-r from-sky-400 to-cyan-400 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.6)] transition-all duration-500" 
              title={`Tweaks: ${tweaks}`}
            />
          )}
          {linesPct > 0 && (
            <div 
              style={{ width: `${linesPct}%` }} 
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.6)] transition-all duration-500" 
              title={`Lines Changed: ${linesChanged}`}
            />
          )}
          {perfPct > 0 && (
            <div 
              style={{ width: `${perfPct}%` }} 
              className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)] transition-all duration-500" 
              title={`Perf Gain: ${perfGain}`}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="glass-panel relative w-full max-w-4xl max-h-[85vh] my-auto flex flex-col rounded-2xl border border-white/15 shadow-2xl shadow-cyan-950/30 overflow-hidden lucid-scale min-h-0"
        style={{ '--delay': '0ms' } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Glow Backdrop */}
        <div 
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: `rgb(${theme.glowPrimary || '6, 182, 212'})` }}
        />
        <div 
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-15"
          style={{ background: `rgb(${theme.glowSecondary || '34, 211, 238'})` }}
        />

        {/* Modal Top Bar / Header Controls */}
        <div className="relative z-10 shrink-0 p-3.5 sm:p-4 pb-3 border-b border-white/10 bg-slate-900/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center border border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
              >
                <Sparkles className="text-cyan-400 animate-pulse" size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold font-mono text-white tracking-tight">
                    Update Log
                  </h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                    {CHANGELOG[0]?.version || 'v1.5.2'} LATEST
                  </span>
                </div>
                <p className="text-xs font-mono text-zinc-400">
                  TypeNova Release History & Technical Notes
                </p>
              </div>
            </div>

            {/* Top Right Controls: Subscribe & Close */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSubscribeToggle}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all border ${
                  subscribed
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                    : 'bg-white/5 hover:bg-white/10 border-white/15 text-white hover:scale-105'
                }`}
                title="Subscribe to release notifications"
              >
                {subscribed ? (
                  <>
                    <Bell size={13} className="text-emerald-400 fill-emerald-400/20" />
                    <span>Subscribed</span>
                  </>
                ) : (
                  <>
                    <Bell size={13} className="text-cyan-400" />
                    <span>Subscribe</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="p-1.5 bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white rounded-full transition-all hover:rotate-90"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Subscription Toast Feedback */}
          {toastMessage && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold shadow-2xl z-50 flex items-center gap-1.5">
              <Check size={13} className="text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Body with Left Sidebar & Content List */}
        <div className="relative z-10 flex-1 flex overflow-hidden min-h-0">
          {/* Left Vertical Timeline Sidebar Navigation */}
          <div className="hidden md:flex flex-col w-36 shrink-0 border-r border-white/10 bg-slate-950/40 p-2 overflow-y-auto custom-scrollbar min-h-0">
            <div className="flex items-center gap-1.5 px-2 py-1 mb-2 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 border-b border-white/5">
              <Layers size={12} className="text-cyan-400" />
              <span>Releases</span>
            </div>

            <div className="relative space-y-1">
              {/* Sidebar Rail Line */}
              <div className="absolute top-3 bottom-3 left-[14px] -translate-x-1/2 w-0.5 bg-gradient-to-b from-cyan-500/50 via-zinc-800 to-zinc-900" />

              {CHANGELOG.map((entry) => {
                const isActive = activeVersion === entry.version;
                return (
                  <button
                    key={entry.version}
                    onClick={() => scrollToRelease(entry.version)}
                    className={`group relative w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all ${
                      isActive 
                        ? 'bg-cyan-500/10 border border-cyan-500/30 text-white shadow-[0_0_12px_rgba(6,182,212,0.15)]' 
                        : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200 border border-transparent'
                    }`}
                  >
                    {/* Node Dot */}
                    <div className={`relative z-10 w-2 h-2 rounded-full transition-all shrink-0 ${
                      isActive 
                        ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] scale-110' 
                        : 'bg-zinc-700 group-hover:bg-zinc-500'
                    }`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-mono font-bold truncate ${isActive ? 'text-cyan-300' : ''}`}>
                          {entry.version}
                        </span>
                        {entry.version === CHANGELOG[0]?.version && (
                          <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate font-mono">
                        {entry.date}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Main Scrollable Changelog List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 custom-scrollbar min-h-0 transform-gpu">
            {CHANGELOG.map((release, i) => (
              <div 
                key={release.version}
                ref={(el) => { releaseRefs.current[release.version] = el; }}
                className="relative group"
              >
                {/* Timeline Card Wrapper */}
                <div
                  className="lucid-enter relative rounded-xl bg-slate-900/50 border border-white/10 p-3.5 sm:p-4 transition-colors duration-150 hover:border-cyan-500/30 hover:bg-slate-900/70"
                  style={{ '--delay': `${i * 30}ms` } as React.CSSProperties}
                >
                  
                  {/* Header of Release Card */}
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3 pb-2.5 border-b border-white/10">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-lg sm:text-xl font-bold font-mono ${
                          i === 0 ? 'text-cyan-400' : 'text-white'
                        }`}>
                          {release.version}
                        </span>
                        <span className="text-xs font-mono text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                          {release.date}
                        </span>
                        {i === 0 && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                            LATEST RELEASE
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm sm:text-base font-bold font-mono text-zinc-200">
                        {release.title}
                      </h4>
                    </div>
                  </div>

                  {/* Dense Change Items Single Divide-Y List */}
                  <div className="divide-y divide-white/5 bg-white/[0.02] border border-white/5 rounded-lg overflow-hidden">
                    {release.changes.map((change, j) => (
                      <div 
                        key={j} 
                        className="px-2.5 py-1.5 flex items-start gap-2 hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="mt-0.5 shrink-0">
                          {getIconForType(change.type)}
                        </div>
                        <div className="flex-1 min-w-0 flex items-start gap-2">
                          <span className={`shrink-0 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${getTypeBadgeStyle(change.type)}`}>
                            {getLabelForType(change.type)}
                          </span>
                          <p className="text-xs font-mono text-zinc-300 leading-normal flex-1 min-w-0">
                            {change.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Compact Impact Bar Section */}
                  {renderImpactBar(release.impact)}

                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
