import React, { memo, useState } from 'react';
import { Flame, Trophy, BarChart2, Swords, Users, MessageSquare, Settings, Lock, Menu, X } from 'lucide-react';
import { toast } from 'sonner';
import { TypeNovaLogo } from '@/components/TypeNovaLogo';
import { TITLE_BADGES } from '@/data/titles';
import type { Theme } from '@/data/constants';

interface CosmicNavBarProps {
  theme: Theme;
  username: string | null;
  userLevel: number;
  currentLevelProgress: number;
  xpNeeded: number;
  xp: number;
  activeTitle: string;
  dailyStreak: number;
  isLoggedIn: boolean;
  unlockedAchievements: string[];
  // Callbacks
  onOpenProfile: (username: string) => void;
  onOpenTrophies: () => void;
  onOpenStats: () => void;
  onOpenRace: () => void;
  onOpenAcademy: () => void;
  onOpenPractice: () => void;
  onOpenSocial: () => void;
  onOpenComms: () => void;
  onOpenSettings: () => void;
  onOpenDailyQuests: () => void;
  // Active page for nav link highlighting
  activePage?: 'academy' | 'practice' | 'compete' | 'store';
}

export const CosmicNavBar = memo(function CosmicNavBar({
  theme,
  username,
  userLevel,
  currentLevelProgress,
  xpNeeded,
  xp,
  activeTitle,
  dailyStreak,
  isLoggedIn,
  unlockedAchievements,
  onOpenProfile,
  onOpenTrophies,
  onOpenStats,
  onOpenRace,
  onOpenAcademy,
  onOpenPractice,
  onOpenSocial,
  onOpenComms,
  onOpenSettings,
  onOpenDailyQuests,
  activePage = 'practice'
}: CosmicNavBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeBadge = TITLE_BADGES.find(b => b.id === activeTitle);

  const getNavLinkStyle = (page: 'academy' | 'practice' | 'compete' | 'store') => {
    if (activePage === page) {
      return { 
        color: `rgb(${theme.glowPrimary})`, 
        textShadow: `0 0 15px rgba(${theme.glowPrimary}, 0.6)` 
      };
    }
    return {};
  };

  const navLinks: Array<{ id: 'academy' | 'practice' | 'compete' | 'store'; label: string; onClick: () => void; badge?: string }> = [
    { id: 'academy', label: 'Academy', onClick: onOpenAcademy },
    { id: 'practice', label: 'Practice', onClick: onOpenPractice },
    { id: 'compete', label: 'Compete', onClick: onOpenRace },
    { 
      id: 'store', 
      label: 'Store', 
      badge: 'SOON', 
      onClick: () => toast.info('TypeNova Store is coming soon! Unlock themes, sound profiles & CyberHands cosmetics.', { icon: '🛍️' }) 
    },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 w-full px-6 md:px-10 py-3 glass-panel border-t-0 rounded-b-3xl z-50 flex items-center justify-between font-display transition-[background-color,border-color,box-shadow] duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {/* Left: Logo & Academy CTA */}
        <div className="flex items-center gap-4">
          <TypeNovaLogo size="md" />
          {activePage !== 'academy' && (
            <button 
              onClick={onOpenAcademy}
              className="hidden sm:flex items-center gap-2 glass-pill px-4 py-1.5 border-amber-400/30 text-amber-300 hover:border-amber-400/70 transition-all shadow-[0_0_15px_rgba(245,158,11,0.15)] group cursor-pointer"
            >
              <span className="text-base group-hover:scale-110 transition-transform">🎓</span>
              <div className="flex flex-col items-start leading-none text-left">
                <span className="text-[8px] uppercase tracking-widest opacity-70 font-semibold">New to typing?</span>
                <span className="font-bold text-xs">Academy</span>
              </div>
            </button>
          )}
        </div>

        {/* Center Section - Nav Links (Title Case with Glow) */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = activePage === link.id;
            return (
              <button
                key={link.id}
                onClick={link.onClick}
                style={
                  isActive
                    ? {
                        color: `rgb(${theme.glowPrimary})`,
                        textShadow: `0 0 15px rgba(${theme.glowPrimary}, 0.6)`,
                      }
                    : undefined
                }
                className={`text-sm font-medium tracking-wide transition-all duration-300 relative py-1 cursor-pointer flex items-center gap-1.5 ${
                  isActive ? 'font-semibold' : 'text-zinc-300 hover:text-white'
                }`}
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    {link.badge}
                  </span>
                )}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 w-full h-[2px] rounded-full"
                    style={{
                      backgroundColor: `rgb(${theme.glowPrimary})`,
                      boxShadow: `0 0 10px rgba(${theme.glowPrimary}, 0.9)`,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Section */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Identity Capsule */}
          <button
            onClick={() => onOpenProfile(username || 'Guest')}
            className="group flex items-center px-3.5 py-1.5 glass-pill border-white/15 hover:border-white/30 transition-all cursor-pointer text-left gap-3 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]"
            title="View / Edit your Player Profile"
          >
            <div className="relative shrink-0">
              <div
                className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-bold uppercase text-sm shadow-[inset_0_0_10px_rgba(255,255,255,0.15)]"
                style={{ color: `rgb(${theme.glowPrimary})` }}
              >
                {(username || 'G').substring(0, 1)}
              </div>
            </div>

            <div className="flex flex-col pr-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide">
                  {username || 'GUEST'}
                </span>
                <span className="text-zinc-400 font-semibold text-xs">LVL {userLevel}</span>
                {activeBadge && (
                  <div className="glass-pill px-2 py-0.5 text-[10px] text-zinc-300 flex items-center gap-1 border-white/10">
                    <span>{activeBadge.icon}</span>
                    <span>{activeBadge.name}</span>
                  </div>
                )}
              </div>
              <div className="w-32 h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.min(100, (currentLevelProgress / Math.max(1, xpNeeded)) * 100)}%`,
                    background: `linear-gradient(to right, rgb(${theme.glowPrimary}), rgb(${theme.glowSecondary}))`,
                    boxShadow: `0 0 10px rgba(${theme.glowPrimary}, 0.6)`,
                  }}
                />
              </div>
            </div>
          </button>

          {/* Action Tray */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenDailyQuests}
              className="glass-pill h-10 px-3 flex items-center gap-1.5 text-amber-300 hover:text-amber-200 border-amber-400/30 hover:border-amber-400/60 bg-amber-400/10 text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:scale-105 cursor-pointer"
              title="Daily Quests & Streaks"
            >
              <Flame size={15} className="animate-pulse" />
              <span>{dailyStreak}d</span>
            </button>

            <ActionButton icon={Trophy} onClick={onOpenTrophies} isLoggedIn={isLoggedIn} title="Trophies" active={unlockedAchievements.length > 0} theme={theme} />
            <ActionButton icon={BarChart2} onClick={onOpenStats} isLoggedIn={isLoggedIn} title="Stats" theme={theme} />
            <ActionButton icon={Users} onClick={onOpenSocial} isLoggedIn={isLoggedIn} title="Community" theme={theme} />
            <ActionButton icon={MessageSquare} onClick={onOpenComms} isLoggedIn={isLoggedIn} title="Comms" theme={theme} />
            <ActionButton icon={Settings} onClick={onOpenSettings} isLoggedIn={true} title="Settings" theme={theme} />
          </div>
        </div>

        {/* Mobile Hamburger */}
        <button 
          className="lg:hidden p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-80 glass-panel border-l border-white/10 h-full flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
            <button 
              className="absolute top-6 right-6 text-zinc-400 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X size={24} />
            </button>
            
            <TypeNovaLogo size="sm" />
            
            {/* Identity Capsule in Mobile Drawer */}
            <div className="mt-6">
              <button
                onClick={() => { onOpenProfile(username || 'Guest'); setMobileMenuOpen(false); }}
                className="w-full flex items-center px-3.5 py-3 glass-panel rounded-2xl border border-white/5 hover:border-white/20 transition-all cursor-pointer text-left gap-3.5"
                title="View / Edit your Player Profile"
              >
                <div className={`w-10 h-10 rounded-full bg-black/20 border flex items-center justify-center font-bold uppercase text-sm shrink-0 ${theme.borderHalf} ${theme.vividText}`}>
                  {(username || 'G').substring(0, 1)}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-white truncate">
                      {username || 'GUEST'}
                    </span>
                    <span className="text-zinc-500 font-bold text-[10px] shrink-0">LVL {userLevel}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${theme.solid}`} style={{ width: `${Math.min(100, (currentLevelProgress / Math.max(1, xpNeeded)) * 100)}%` }} />
                    </div>
                    <span className="text-[9px] font-mono text-zinc-500 shrink-0">{xp} XP</span>
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => { link.onClick(); setMobileMenuOpen(false); }}
                  className={`text-left text-lg font-bold tracking-wide uppercase flex items-center justify-between ${activePage === link.id ? 'opacity-100' : 'text-zinc-400'}`}
                  style={getNavLinkStyle(link.id)}
                >
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {link.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-auto pt-8 flex flex-wrap gap-2.5 items-center">
              <button
                onClick={() => { onOpenDailyQuests(); setMobileMenuOpen(false); }}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 text-xs font-mono font-bold transition-all"
                title="Daily Quests & Streaks"
              >
                <Flame size={14} className="animate-pulse" />
                <span>{dailyStreak}d</span>
              </button>
              <ActionButton icon={Trophy} onClick={() => { onOpenTrophies(); setMobileMenuOpen(false); }} isLoggedIn={isLoggedIn} title="Trophies" active={unlockedAchievements.length > 0} theme={theme} />
              <ActionButton icon={BarChart2} onClick={() => { onOpenStats(); setMobileMenuOpen(false); }} isLoggedIn={isLoggedIn} title="Stats" theme={theme} />
              <ActionButton icon={Swords} onClick={() => { onOpenRace(); setMobileMenuOpen(false); }} isLoggedIn={true} title="Race" theme={theme} />
              <ActionButton icon={Users} onClick={() => { onOpenSocial(); setMobileMenuOpen(false); }} isLoggedIn={isLoggedIn} title="Community" theme={theme} />
              <ActionButton icon={MessageSquare} onClick={() => { onOpenComms(); setMobileMenuOpen(false); }} isLoggedIn={isLoggedIn} title="Comms" theme={theme} />
              <ActionButton icon={Settings} onClick={() => { onOpenSettings(); setMobileMenuOpen(false); }} isLoggedIn={true} title="Settings" theme={theme} />
            </div>
          </div>
        </div>
      )}
    </>
  );
});

function ActionButton({ 
  icon: Icon, 
  onClick, 
  isLoggedIn, 
  title,
  active = false,
  theme
}: { 
  icon: React.ElementType, 
  onClick: () => void, 
  isLoggedIn: boolean, 
  title: string,
  active?: boolean,
  theme: Theme
}) {
  return (
    <button
      onClick={isLoggedIn ? onClick : undefined}
      style={
        isLoggedIn && active
          ? {
              borderColor: `rgba(${theme.glowPrimary}, 0.6)`,
              color: `rgb(${theme.glowPrimary})`,
              backgroundColor: `rgba(${theme.glowPrimary}, 0.1)`,
              boxShadow: `0 0 18px rgba(${theme.glowPrimary}, 0.35)`,
            }
          : undefined
      }
      className={`glass-pill w-10 h-10 flex items-center justify-center transition-all cursor-pointer ${
        !isLoggedIn 
          ? 'border-white/5 text-zinc-600 cursor-not-allowed opacity-40' 
          : active 
            ? ''
            : 'text-zinc-300 hover:text-white border-white/15 hover:border-white/40 hover:bg-white/10 shadow-sm'
      }`}
      title={isLoggedIn ? title : `Sign in to unlock ${title}`}
    >
      {isLoggedIn ? <Icon size={16} /> : <Lock size={14} />}
    </button>
  );
}
