import { memo } from 'react';
import { Settings, Sparkles, X, Bot } from 'lucide-react';
import { AccountMenu } from '@/components/AccountMenu';
import type { Theme } from '@/data/constants';
import type { SyncStatus } from '@/hooks/useCloudSync';

interface BottomControlsDockProps {
  shouldHideClutter: boolean;
  theme: Theme;
  activeModal: string | null;
  isAruOpen: boolean;
  onToggleAru: () => void;
  onOpenSettings: () => void;
  onOpenChangelog: () => void;
  latestVersion: string;
  cloud: {
    username: string | null;
    status: SyncStatus;
    elo: number;
  };
  auth: {
    user: {
      user_metadata?: {
        avatar_url?: string;
        picture?: string;
      };
    } | null;
  };
  onSignIn: () => void;
  onSignOut: () => void;
}

export const BottomControlsDock = memo(function BottomControlsDock({
  shouldHideClutter,
  theme,
  activeModal,
  isAruOpen,
  onToggleAru,
  onOpenSettings,
  onOpenChangelog,
  latestVersion,
  cloud,
  auth,
  onSignIn,
  onSignOut,
}: BottomControlsDockProps) {
  if (shouldHideClutter) return null;

  return (
    <>
      {/* Floating Bottom-Right Controls Pill */}
      <div className="fixed bottom-6 right-6 z-[500] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
        <div className="flex items-center gap-1.5 glass-panel rounded-full p-1.5 shadow-[0_18px_45px_-12px_rgba(0,0,0,0.85)]">
          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className={`p-2.5 rounded-full ${activeModal === 'settings' ? 'bg-white/10 text-white' : 'hover:bg-white/[0.08] text-zinc-400 hover:text-white'} flex justify-center items-center transition-all cursor-pointer`}
            title="Settings"
          >
            <Settings size={15} />
          </button>

          <div className="w-px h-5 bg-white/10 mx-0.5" />

          {/* Ask Aru AI Button */}
          <button
            onClick={onToggleAru}
            className={`relative flex items-center gap-2.5 px-5 py-2 rounded-full transition-all duration-500 group overflow-hidden cursor-pointer ${
              isAruOpen 
                ? `bg-[rgba(${theme.glowPrimary},0.2)] border border-[rgba(${theme.glowPrimary},0.5)] shadow-[0_0_30px_rgba(${theme.glowPrimary},0.6)] scale-95` 
                : 'bg-[#0f0e1a] border border-fuchsia-500/20 hover:border-transparent shadow-[0_0_20px_rgba(217,70,239,0.15)] hover:shadow-[0_0_40px_rgba(34,211,238,0.4)]'
            }`}
            title="Ask Aru — AI Typing Coach"
          >
            {/* Spinning Neon Gradient Border (Active on Hover) */}
            {!isAruOpen && (
              <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,#c084fc_33%,#22d3ee_66%,transparent_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            )}
            
            {/* Dark Inner Surface */}
            {!isAruOpen && (
              <span className="absolute inset-[1px] rounded-full bg-[#0a0914] z-0 transition-colors duration-500 group-hover:bg-[#0f0e1a]" />
            )}

            {/* Animated Sheen Sweep */}
            <span className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-full">
              <span className="absolute top-0 left-[-100%] h-full w-[60%] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-25deg] transition-all duration-1000 group-hover:left-[200%] ease-in-out" />
            </span>

            <div className="relative z-10 flex items-center gap-2">
              {isAruOpen ? (
                <>
                  <X size={15} className="text-fuchsia-400" />
                  <span className="text-[11px] font-black tracking-[0.2em] uppercase text-fuchsia-300">Close</span>
                </>
              ) : (
                <>
                  {/* AI Core Pulse Indicator */}
                  <div className="relative flex items-center justify-center">
                    <Bot size={16} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] group-hover:rotate-12 group-hover:scale-110 transition-transform duration-500" />
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75 duration-1000" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-500 shadow-[0_0_10px_#d946ef]" />
                    </span>
                  </div>
                  <span className="text-[11px] font-black tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-pink-300 group-hover:from-white group-hover:to-cyan-100 transition-all drop-shadow-sm">
                    Ask Aru
                  </span>
                  <Sparkles size={13} className="text-amber-300 animate-pulse drop-shadow-[0_0_5px_rgba(252,211,77,0.8)]" />
                </>
              )}
            </div>
          </button>

          <div className="w-px h-5 bg-white/10 mx-0.5" />

          {/* Account: Google login */}
          <AccountMenu
            theme={theme}
            loggedIn={!!cloud.username}
            displayName={cloud.username}
            avatarUrl={auth.user?.user_metadata?.avatar_url ?? auth.user?.user_metadata?.picture ?? null}
            status={cloud.status}
            elo={cloud.elo}
            onSignIn={onSignIn}
            onSignOut={onSignOut}
          />
        </div>
      </div>

      {/* Floating Bottom-Left Version/Changelog Badge */}
      <button
        onClick={onOpenChangelog}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full glass-pill border-white/10 hover:border-white/25 text-zinc-400 hover:text-white transition-all duration-300 group cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.08)] active:scale-95"
        title="View Changelog & Updates"
      >
        <Sparkles 
          size={12} 
          className="shrink-0 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
          style={{ color: `rgb(${theme.glowPrimary})` }} 
        />
        <span className="text-[10px] font-bold tracking-wider text-zinc-300 group-hover:text-white font-mono">
          {latestVersion}
        </span>
        <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all duration-300 text-[10px] font-semibold text-zinc-300 bg-white/10 px-0 group-hover:px-2 py-0.5 rounded-full">
          What's New
        </span>
      </button>
    </>
  );
});
