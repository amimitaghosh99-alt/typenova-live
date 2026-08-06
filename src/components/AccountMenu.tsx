import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { LogIn, LogOut, Cloud, CloudOff, Loader, ChevronDown } from 'lucide-react';
import type { Theme } from '@/data/constants';
import type { SyncStatus } from '@/hooks/useCloudSync';

interface AccountMenuProps {
  theme: Theme;
  loggedIn: boolean;
  displayName: string | null;
  avatarUrl?: string | null;
  status: SyncStatus;
  elo: number;
  onSignIn: () => void;
  onSignOut: () => void;
}

const STATUS_TEXT: Record<SyncStatus, string> = {
  idle: 'Not synced',
  syncing: 'Syncing…',
  synced: 'Progress synced',
  error: 'Sync error',
  'needs-username': 'Pick a name',
};

export const AccountMenu = ({
  theme, loggedIn, displayName, avatarUrl, status, elo, onSignIn: _onSignIn, onSignOut,
}: AccountMenuProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      // Use composedPath to handle if the target was removed from DOM
      const path = e.composedPath();
      if (ref.current && !path.includes(ref.current)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick, { passive: true });
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Rendered as a bare segment of the shared floating control bar — it must
  // not carry its own glass surface, or it reads as a tile on a tile.
  if (!loggedIn) {
    return (
      <button
        onClick={() => navigate('/login')}
        className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors ${theme.bgHover}`}
        title="Sign in to save & submit"
      >
        <LogIn size={14} className={theme.text} /> Log in
      </button>
    );
  }

  const initial = (displayName || '?').charAt(0).toUpperCase();
  const SyncIcon = status === 'syncing' ? Loader : status === 'error' ? CloudOff : Cloud;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 rounded-full p-1 pr-2.5 transition-colors ${open ? 'bg-white/[0.08]' : 'hover:bg-white/[0.06]'}`}
        title="Account"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-white/15" referrerPolicy="no-referrer" />
        ) : (
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white ${theme.solid}`}>{initial}</span>
        )}
        <span className="text-[10px] font-black uppercase tracking-widest text-white max-w-[90px] truncate">{displayName || '…'}</span>
        <ChevronDown size={12} className={`text-zinc-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        className={`!absolute bottom-full mb-3 right-0 w-52 glass-panel rounded-2xl overflow-hidden origin-bottom-right transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] z-[1000] ${open ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'}`}
      >
        <div className="p-4 border-b border-zinc-800/70">
          <p className="text-zinc-500 text-[9px] font-black tracking-widest uppercase mb-1">Ranked Elo</p>
          <p className={`text-2xl font-black ${theme.text}`}>{elo}</p>
        </div>
        <div className="p-3 border-b border-zinc-800/70 flex items-center gap-2">
          <SyncIcon size={13} className={`${status === 'error' ? 'text-red-400' : theme.text} ${status === 'syncing' ? 'animate-spin' : ''}`} />
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{STATUS_TEXT[status]}</span>
        </div>
        <button
          onClick={() => { setOpen(false); onSignOut(); }}
          className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  );
};
