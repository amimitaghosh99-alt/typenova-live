import React, { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, GraduationCap, Swords, Users, MessageSquare, Lock, Menu, X, HandHeart } from 'lucide-react';
import { toast } from 'sonner';
import { TypeNovaLogo } from '@/components/TypeNovaLogo';
import { TITLE_BADGES } from '@/data/titles';
import { TITLE_MARK } from '@/lib/titleIcons';
import { AvatarArt } from '@/components/profile/AvatarKeycap';
import { ALL_BANNERS, AVATARS } from '@/data/customization';
import { getDonationProgressPercent, PREMIUM_ACCENT } from '@/data/donation';
import type { Theme } from '@/data/constants';

interface CosmicNavBarProps {
  theme: Theme;
  username: string | null;
  avatarId?: string;
  bannerId?: string;
  avatarUrl?: string | null;
  userLevel: number;
  currentLevelProgress: number;
  xpNeeded: number;
  xp: number;
  activeTitle: string;
  dailyStreak: number;
  isLoggedIn: boolean;
  unlockedAchievements?: string[];
  // Callbacks
  onOpenProfile: (username: string) => void;
  onOpenTrophies?: () => void;
  onOpenRace: () => void;
  onOpenAcademy: () => void;
  onOpenPractice: () => void;
  onOpenSocial: () => void;
  onOpenComms: () => void;
  onOpenSettings?: () => void;
  onOpenDailyQuests: () => void;
  onOpenDonate?: () => void;
  // Active page for nav link highlighting
  activePage?: 'academy' | 'practice' | 'compete' | 'store' | 'dossier' | 'donate';
  // Clutter hiding state during typing
  shouldHide?: boolean;
}

export const CosmicNavBar = memo(function CosmicNavBar({
  theme,
  username,
  avatarId = 'default',
  bannerId = 'basic_dark',
  avatarUrl = null,
  userLevel,
  currentLevelProgress,
  xpNeeded,
  xp,
  activeTitle,
  dailyStreak,
  isLoggedIn,
  unlockedAchievements: _unlockedAchievements,
  onOpenProfile,
  onOpenTrophies: _onOpenTrophies,
  onOpenRace,
  onOpenAcademy,
  onOpenPractice,
  onOpenSocial,
  onOpenComms,
  onOpenSettings: _onOpenSettings,
  onOpenDailyQuests,
  onOpenDonate,
  activePage = 'practice',
  shouldHide = false,
}: CosmicNavBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const donationGoalPercent = getDonationProgressPercent();

  useEffect(() => {
    if (shouldHide && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [shouldHide, mobileMenuOpen]);

  const activeBadge = TITLE_BADGES.find(b => b.id === activeTitle);
  /* Capitalised because JSX resolves a lowercase tag to an HTML element. */
  const ActiveTitleIcon = activeBadge ? TITLE_MARK[activeBadge.id] : null;

  const selectedBanner = ALL_BANNERS.find(b => b.id === bannerId) || ALL_BANNERS[0];
  const selectedAvatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];

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
      onClick: () => toast.info('TypeNova Store is coming soon! Unlock themes, sound profiles & CyberHands cosmetics.')
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
        className={`!fixed top-0 left-0 w-full px-6 md:px-10 py-3 glass-panel border-t-0 rounded-b-3xl z-[var(--z-nav)] flex items-center justify-between font-display transition-[background-color,border-color,box-shadow,opacity,transform] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-[0_8px_32px_rgba(0,0,0,0.4)] will-change-[transform,opacity] ${
          shouldHide
            ? '-translate-y-full opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100'
        }`}
      >

        {/* Left: Logo & Academy CTA */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenPractice}
            className="cursor-pointer focus:outline-none flex items-center hover:opacity-90 transition-opacity"
            title="TypeNova Home"
          >
            <TypeNovaLogo size="md" />
          </button>
          {activePage !== 'academy' && (
            <button
              onClick={onOpenAcademy}
              className="hidden sm:flex items-center gap-2 nav-pill px-4 py-1.5 border-amber-400/30 text-amber-300 hover:border-amber-400/70 transition-all shadow-[0_0_15px_rgba(245,158,11,0.15)] group cursor-pointer"
            >
              {/* An icon, not the 🎓 emoji this used to be: an emoji renders in
                  the platform's own font and colour, so it could not take the
                  amber the rest of this pill is set in. */}
              <GraduationCap
                size={16}
                aria-hidden
                className="shrink-0 transition-transform group-hover:scale-110"
              />
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
                  <motion.span
                    layoutId="cosmicNavUnderline"
                    transition={{ type: 'spring', stiffness: 480, damping: 36 }}
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
            className={`group relative overflow-hidden flex items-center px-3.5 py-1.5 rounded-full transition-all cursor-pointer text-left gap-3 active:scale-[0.98] border backdrop-blur-xl ${selectedBanner.accentBorder || 'border-white/20'} ${activePage === 'dossier' ? 'border-white/50 shadow-lg' : 'hover:border-white/40'}`}
            style={{
              boxShadow: `0 0 16px rgba(${selectedBanner.glowColor || theme.glowPrimary}, 0.22), inset 0 0 10px rgba(255, 255, 255, 0.04)`,
            }}
            title="View / Edit your Player Profile"
          >
            {/* Banner Background Tint */}
            <div className={`absolute inset-0 opacity-35 pointer-events-none transition-opacity ${selectedBanner.bgClass}`} />
            <div className="absolute inset-0 bg-black/40 pointer-events-none backdrop-blur-md" />

            {/* Avatar: Keycap / Photo / Letter */}
            <div className="relative z-10 shrink-0 flex items-center justify-center">
              {avatarUrl && (!avatarId || avatarId === 'default') ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-md"
                  referrerPolicy="no-referrer"
                />
              ) : avatarId && avatarId !== 'default' ? (
                <div className="drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] flex items-center justify-center">
                  <AvatarArt id={avatarId} size={38} />
                </div>
              ) : (
                <div
                  className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-bold uppercase text-sm shadow-[inset_0_0_10px_rgba(255,255,255,0.15)]"
                  style={{ color: `rgb(${selectedAvatar.glowColor || theme.glowPrimary})` }}
                >
                  {(username || 'G').substring(0, 1)}
                </div>
              )}
            </div>

            <div className="relative z-10 flex flex-col pr-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide">
                  {username || 'GUEST'}
                </span>
                <span className="text-zinc-400 font-semibold text-xs">LVL {userLevel}</span>
                {activeBadge && ActiveTitleIcon && (
                  <div className="nav-pill px-2 py-0.5 text-[10px] text-zinc-300 flex items-center gap-1">
                    <ActiveTitleIcon size={11} aria-hidden className="shrink-0" />
                    <span>{activeBadge.name}</span>
                  </div>
                )}
              </div>
              <div className="w-32 h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.min(100, (currentLevelProgress / Math.max(1, xpNeeded)) * 100)}%`,
                    background: `linear-gradient(to right, rgb(${selectedBanner.glowColor || theme.glowPrimary}), rgb(${theme.glowSecondary}))`,
                    boxShadow: `0 0 10px rgba(${selectedBanner.glowColor || theme.glowPrimary}, 0.6)`,
                  }}
                />
              </div>
            </div>
          </button>

          {/* Action Tray */}
          <div className="flex items-center gap-2">
            {/* Community Support Capsule — premium gold treatment */}
            <button
              onClick={onOpenDonate}
              className={`nav-pill h-9 px-2.5 sm:px-3 flex items-center gap-2 text-left transition-all cursor-pointer group ${
                activePage === 'donate'
                  ? 'ring-1 shadow-[0_0_20px_rgba(212,175,55,0.30)]'
                  : 'shadow-[0_0_12px_rgba(212,175,55,0.10)] hover:shadow-[0_0_18px_rgba(212,175,55,0.22)]'
              }`}
              style={
                activePage === 'donate'
                  ? {
                      borderColor: 'rgba(212, 175, 55, 0.55)',
                      background: 'rgba(212, 175, 55, 0.18)',
                      // @ts-expect-error ring color as CSS property
                      '--tw-ring-color': 'rgba(212, 175, 55, 0.45)',
                    }
                  : {
                      borderColor: 'rgba(212, 175, 55, 0.28)',
                      background: 'rgba(212, 175, 55, 0.07)',
                    }
              }
              title={`Support TypeNova — ${donationGoalPercent}% of community goal funded`}
            >
              <HandHeart
                size={13}
                className="group-hover:scale-110 transition-transform shrink-0"
                style={{ color: PREMIUM_ACCENT }}
              />
              <span className="text-[11.5px] font-bold text-white tracking-wide">Support</span>
              {/* Refined progress dot: marks the goal without shouting */}
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-700"
                style={{
                  backgroundColor: PREMIUM_ACCENT,
                  boxShadow: `0 0 6px rgba(212, 175, 55, ${donationGoalPercent > 0 ? 0.9 : 0.4})`,
                  opacity: donationGoalPercent > 0 ? 1 : 0.5,
                }}
              />
            </button>

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
              <ActionButton icon={Users} onClick={onOpenSocial} isLoggedIn={isLoggedIn} title="Community" theme={theme} />
              <ActionButton icon={MessageSquare} onClick={onOpenComms} isLoggedIn={isLoggedIn} title="Comms" theme={theme} />
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
                className={`relative overflow-hidden w-full flex items-center px-3.5 py-3 rounded-2xl border transition-all cursor-pointer text-left gap-3.5 ${selectedBanner.accentBorder || 'border-white/10'} hover:border-white/30`}
                style={{
                  boxShadow: `0 0 14px rgba(${selectedBanner.glowColor || theme.glowPrimary}, 0.18)`,
                }}
                title="View / Edit your Player Profile"
              >
                <div className={`absolute inset-0 opacity-35 pointer-events-none transition-opacity ${selectedBanner.bgClass}`} />
                <div className="absolute inset-0 bg-black/50 pointer-events-none backdrop-blur-md" />

                <div className="relative z-10 shrink-0 flex items-center justify-center">
                  {avatarUrl && (!avatarId || avatarId === 'default') ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  ) : avatarId && avatarId !== 'default' ? (
                    <div className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] flex items-center justify-center">
                      <AvatarArt id={avatarId} size={38} />
                    </div>
                  ) : (
                    <div className={`w-10 h-10 rounded-full bg-black/20 border flex items-center justify-center font-bold uppercase text-sm ${theme.borderHalf} ${theme.vividText}`}>
                      {(username || 'G').substring(0, 1)}
                    </div>
                  )}
                </div>
                <div className="relative z-10 flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-white truncate">
                      {username || 'GUEST'}
                    </span>
                    <span className="text-zinc-500 font-bold text-[10px] shrink-0">LVL {userLevel}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (currentLevelProgress / Math.max(1, xpNeeded)) * 100)}%`,
                          backgroundColor: `rgb(${selectedBanner.glowColor || theme.glowPrimary})`,
                        }}
                      />
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
                onClick={() => { onOpenDonate?.(); setMobileMenuOpen(false); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-900 text-xs font-mono font-bold transition-all"
                style={{
                  boxShadow: `0 0 15px ${PREMIUM_ACCENT}50`,
                }}
                title="Support TypeNova"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 animate-pulse" />
                <span>Support</span>
              </button>

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
                <ActionButton icon={Swords} onClick={() => { onOpenRace(); setMobileMenuOpen(false); }} isLoggedIn={true} title="Race" theme={theme} />
                <ActionButton icon={Users} onClick={() => { onOpenSocial(); setMobileMenuOpen(false); }} isLoggedIn={isLoggedIn} title="Community" theme={theme} />
                <ActionButton icon={MessageSquare} onClick={() => { onOpenComms(); setMobileMenuOpen(false); }} isLoggedIn={isLoggedIn} title="Comms" theme={theme} />
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
