import React, { memo, useState } from 'react';
import { Flame, Trophy, Swords, Users, MessageSquare, Settings, Lock, Menu, X } from 'lucide-react';
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
  onOpenRace: () => void;
  onOpenAcademy: () => void;
  onOpenPractice: () => void;
  onOpenSocial: () => void;
  onOpenComms: () => void;
  onOpenSettings: () => void;
  onOpenDailyQuests: () => void;
  // Active page for nav link highlighting
  activePage?: 'academy' | 'practice' | 'compete' | 'store' | 'dossier';
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
      {/* data-app-chrome is how useAppChrome finds this element to measure.
          The header's height is NOT constant — the identity capsule on the
          right is `hidden lg:flex`, so it is genuinely shorter below lg. Every
          stage reads the measured --nav-h rather than guessing a pixel value.

          `!fixed`, not `fixed`: `.glass-panel` declares `position: relative` in
          plain CSS (src/index.css), which sits after Tailwind's utilities layer
          and therefore won every cascade against it. The navbar was silently
          `relative` — it took 80px of document flow while every stage ALSO
          reserved `--nav-h` of top padding to clear it, so the header's height
          was paid for twice and each stage lost 80px of usable height. */}
      <header
        data-app-chrome="nav"
        className="!fixed top-0 left-0 w-full px-6 md:px-10 py-3 glass-panel border-t-0 rounded-b-3xl z-[var(--z-nav)] flex items-center justify-between font-display transition-[background-color,border-color,box-shadow] duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
      >

        {/* Left: Logo & Academy CTA */}
        <div className="flex items-center gap-4">
          <TypeNovaLogo size="md" />
          {activePage !== 'academy' && (
            <button
              onClick={onOpenAcademy}
              className="hidden sm:flex items-center gap-2 nav-pill px-4 py-1.5 border-amber-400/30 text-amber-300 hover:border-amber-400/70 transition-all shadow-[0_0_15px_rgba(245,158,11,0.15)] group cursor-pointer"
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
                className={`text-sm font-medium tracking-wide transition-all duration-300 relative py-1 cursor-pointer flex items-center gap-1.5 ${isActive ? 'font-semibold' : 'text-zinc-300 hover:text-white'
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

        {/* Right Section — three groups: identity, streak, tools. */}
        <div className="hidden lg:flex items-center gap-2.5">
          {/* Identity Capsule */}
          <button
            onClick={() => onOpenProfile(username || 'Guest')}
            // Now that the dossier is a route, the capsule is a nav destination
            // like the links to its left — so it gets the same active treatment.
            aria-current={activePage === 'dossier' ? 'page' : undefined}
            className={`group flex items-center px-3.5 py-1.5 nav-pill transition-all cursor-pointer text-left gap-3 active:scale-[0.98] ${activePage === 'dossier' ? 'border-white/40' : 'hover:border-white/25'}`}
            style={activePage === 'dossier' ? { boxShadow: `0 0 18px rgba(${theme.glowPrimary}, 0.25)` } : undefined}
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
                  <div className="nav-pill px-2 py-0.5 text-[10px] text-zinc-300 flex items-center gap-1">
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
              className="nav-pill h-9 px-3 flex items-center gap-1.5 text-amber-300 hover:text-amber-200 border-amber-400/30 hover:border-amber-400/60 bg-amber-400/10 hover:bg-amber-400/20 text-xs font-mono font-bold transition-all cursor-pointer"
              title="Daily Quests & Streaks"
            >
              <Flame size={15} className="animate-pulse" />
              <span>{dailyStreak}d</span>
            </button>

            {/* No surface at all: the tools sit directly on the bar and only
                grow a background on hover. They each used to carry a
                `glass-pill` — a fill darker than the navbar itself, plus a 30px
                black drop shadow and a backdrop blur nested inside the bar's
                own — which rendered as five black coins in a row. */}
            <div className="flex items-center gap-0.5">
              <ActionButton icon={Trophy} onClick={onOpenTrophies} isLoggedIn={isLoggedIn} title="Trophies" active={unlockedAchievements.length > 0} theme={theme} />
              {/* No Stats button. Everything it opened — trends, personal bests,
                  lifetime totals, the key heatmap — is on the dossier's Progress
                  tab, which is one click away via the identity capsule. */}
              <ActionButton icon={Users} onClick={onOpenSocial} isLoggedIn={isLoggedIn} title="Community" theme={theme} />
              <ActionButton icon={MessageSquare} onClick={onOpenComms} isLoggedIn={isLoggedIn} title="Comms" theme={theme} />
              <ActionButton icon={Settings} onClick={onOpenSettings} isLoggedIn={true} title="Settings" theme={theme} />
            </div>
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
        // The trigger for this drawer is `lg:hidden`, but the drawer itself
        // was `md:hidden` — so between 768px and 1023px the hamburger was
        // visible, opened nothing, and Trophies / Stats / Community / Comms
        // (all `hidden lg:flex`) were unreachable at that width.
        <div className="fixed inset-0 z-[var(--z-modal)] flex justify-end lg:hidden">

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
              {/* Same bare row as the desktop tray. */}
              <div className="flex items-center gap-0.5">
                <ActionButton icon={Trophy} onClick={() => { onOpenTrophies(); setMobileMenuOpen(false); }} isLoggedIn={isLoggedIn} title="Trophies" active={unlockedAchievements.length > 0} theme={theme} />
                <ActionButton icon={Swords} onClick={() => { onOpenRace(); setMobileMenuOpen(false); }} isLoggedIn={true} title="Race" theme={theme} />
                <ActionButton icon={Users} onClick={() => { onOpenSocial(); setMobileMenuOpen(false); }} isLoggedIn={isLoggedIn} title="Community" theme={theme} />
                <ActionButton icon={MessageSquare} onClick={() => { onOpenComms(); setMobileMenuOpen(false); }} isLoggedIn={isLoggedIn} title="Comms" theme={theme} />
                <ActionButton icon={Settings} onClick={() => { onOpenSettings(); setMobileMenuOpen(false); }} isLoggedIn={true} title="Settings" theme={theme} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

/**
 * A single icon action in the navbar tool row.
 *
 * Draws nothing at rest — no fill, no border, no shadow — and only grows a
 * faint white wash on hover. Each of these used to be a `glass-pill`, whose
 * fill is darker than the navbar it sits on, so the row read as five black
 * coins. The `active` state (any unlocked achievement, so Trophies almost
 * always) was also loud enough to make its four neighbours look disabled.
 */
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
  const label = isLoggedIn ? title : `Sign in to unlock ${title}`;

  return (
    <button
      onClick={isLoggedIn ? onClick : undefined}
      // Not the `disabled` attribute: browsers suppress mouse events on
      // disabled controls, which would swallow the "sign in to unlock" tooltip.
      aria-disabled={!isLoggedIn}
      style={isLoggedIn && active ? { color: `rgb(${theme.glowPrimary})` } : undefined}
      className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200 ${!isLoggedIn
        ? 'text-zinc-600 opacity-50 cursor-not-allowed'
        : active
          ? 'bg-white/[0.06] hover:bg-white/[0.14] cursor-pointer'
          : 'text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer'
        }`}
      title={label}
      aria-label={label}
    >
      {isLoggedIn ? <Icon size={17} /> : <Lock size={14} />}
      {/* Accent dot in place of the old ring-plus-18px-glow: it marks the
          button without out-shouting the rest of the tray. */}
      {isLoggedIn && active && (
        <span
          aria-hidden="true"
          className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
          style={{
            backgroundColor: `rgb(${theme.glowPrimary})`,
            boxShadow: `0 0 6px rgba(${theme.glowPrimary}, 0.9)`,
          }}
        />
      )}
    </button>
  );
}
