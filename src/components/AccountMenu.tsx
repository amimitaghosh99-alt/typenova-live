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
  theme, loggedIn, displayName, avatarUrl, status, onSignIn, onSignOut,
}: AccountMenuProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!loggedIn) {
    return (
      <button
        onClick={() => navigate('/login')}
        className={`flex items-center gap-2 glass-panel rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white transition-all ${theme.bgHover}`}
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
        className="flex items-center gap-2 glass-panel rounded-2xl p-1.5 pr-3 transition-all hover:bg-white/5"
        title="Account"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-7 h-7 rounded-xl object-cover border border-white/10" referrerPolicy="no-referrer" />
        ) : (
          <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black text-white ${theme.solid}`}>{initial}</span>
        )}
        <span className="text-[10px] font-black uppercase tracking-widest text-white max-w-[90px] truncate">{displayName || '…'}</span>
        <ChevronDown size={12} className={`text-zinc-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        className={`absolute top-full mt-2 right-0 w-52 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden origin-top-right transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] z-[1000] ${open ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-4 pointer-events-none'}`}
      >
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
