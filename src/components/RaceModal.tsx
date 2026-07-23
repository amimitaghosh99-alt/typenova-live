import { useState } from 'react';
import { X, Users, Copy, Check, Play, Crown, Flag, LogOut, Swords, Link } from 'lucide-react';
import type { Theme } from '@/data/constants';
import type { RacerState, RaceStatus } from '@/hooks/useRace';

interface RaceModalProps {
  status: RaceStatus;
  code: string;
  isHost: boolean;
  players: RacerState[];
  error: string;
  selfId: string;
  theme: Theme;
  roomSize: number;
  onCreate: (name: string, size: number) => void;
  onJoin: (code: string, name: string) => void;
  onStart: () => void;
  onLeave: () => void;
  onClose: () => void;
  initialCode?: string;
}

export const RaceModal = ({
  status, code, isHost, players, error, selfId, theme, roomSize,
  onCreate, onJoin, onStart, onLeave, onClose, initialCode
}: RaceModalProps) => {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState(initialCode || '');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedSize, setSelectedSize] = useState(2);

  const accent = { color: `rgb(${theme.glowPrimary})` };
  const canAct = name.trim().length > 0;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable — code is visible anyway */ }
  };

  const copyLink = async () => {
    try {
      const url = `${window.location.origin}/?race=${code}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1500);
    } catch { /* ignore */ }
  };

  const ranking = [...players]
    .filter(p => p.finished)
    .sort((a, b) => (b.finishWpm ?? 0) - (a.finishWpm ?? 0) || (a.finishMs ?? Infinity) - (b.finishMs ?? Infinity));
  const unfinished = players.filter(p => !p.finished);

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 w-full max-w-lg shadow-2xl lucid-scale" style={{ '--delay': '0ms' } as React.CSSProperties} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center">
            <Swords className="mr-3" style={accent} size={24} /> Race Room
          </h2>
          <button onClick={onClose} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-black tracking-widest text-center">
            {error.toUpperCase()}
          </div>
        )}

        {/* ── IDLE / JOINING: create or join ─────────────────────── */}
        {(status === 'idle' || status === 'joining') && (
          <div className="flex flex-col gap-5">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              placeholder="YOUR NAME..."
              maxLength={12}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white font-bold uppercase tracking-widest focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600"
            />

            {/* Room Size Selector */}
            <div className="flex flex-col gap-2">
              <span className="text-zinc-500 text-[10px] font-black tracking-widest text-center">ROOM SIZE</span>
              <div className="flex gap-2 justify-center">
                {([2, 3, 4] as const).map(size => {
                  const labels: Record<number, string> = { 2: '1v1', 3: '1v1v1', 4: '1v1v1v1' };
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-5 py-3 rounded-2xl font-black uppercase tracking-widest text-sm border transition-all ${
                        selectedSize === size
                          ? `bg-white/10 ${theme.borderHalf} text-white`
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {labels[size]}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => canAct && onCreate(name.trim(), selectedSize)}
              disabled={!canAct || status === 'joining'}
              className={`w-full p-4 rounded-2xl font-black uppercase tracking-widest text-sm border transition-all flex items-center justify-center gap-3 ${canAct ? `bg-white/10 ${theme.borderHalf} text-white hover:bg-white/15` : 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'}`}
            >
              <Users size={18} style={canAct ? accent : undefined} /> CREATE ROOM
            </button>
            <div className="flex items-center gap-3 text-zinc-600 text-[10px] font-black tracking-widest">
              <div className="flex-1 h-px bg-zinc-800" /> OR <div className="flex-1 h-px bg-zinc-800" />
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.stopPropagation()}
                placeholder="CODE"
                maxLength={5}
                className="w-32 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 text-white font-black uppercase tracking-[0.3em] text-center focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600 placeholder:tracking-widest"
              />
              <button
                onClick={() => canAct && joinCode.trim().length === 5 && onJoin(joinCode, name.trim())}
                disabled={!canAct || joinCode.trim().length !== 5 || status === 'joining'}
                className={`flex-1 p-4 rounded-2xl font-black uppercase tracking-widest text-sm border transition-all ${canAct && joinCode.trim().length === 5 ? 'bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800' : 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'}`}
              >
                {status === 'joining' ? 'JOINING...' : 'JOIN ROOM'}
              </button>
            </div>
            <p className="text-center text-zinc-600 text-[10px] font-bold tracking-widest">RACE FRIENDS ON THE SAME TEXT, LIVE</p>
          </div>
        )}

        {/* ── LOBBY ──────────────────────────────────────────────── */}
        {status === 'lobby' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl font-black tracking-[0.35em] text-white pl-2" style={accent}>{code}</span>
              <button onClick={copyCode} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all" title="Copy room code">
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              </button>
              <button onClick={copyLink} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all flex items-center gap-2" title="Copy invite link">
                {copiedLink ? <Check size={16} className="text-emerald-400" /> : <Link size={16} />}
                <span className="text-[10px] font-black tracking-widest hidden sm:inline">LINK</span>
              </button>
            </div>
            <p className="text-center text-zinc-500 text-[10px] font-black tracking-widest -mt-2">PLAYERS {players.length} / {roomSize}</p>

            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
              {players.map(p => (
                <div key={p.id} className={`flex items-center justify-between px-5 py-3 rounded-2xl border ${p.id === selfId ? `bg-white/5 ${theme.borderHalf}` : 'bg-zinc-900/50 border-zinc-800'}`}>
                  <span className="font-black text-white tracking-widest uppercase text-sm flex items-center gap-2">
                    {p.isHost && <Crown size={14} className="text-amber-400" />} {p.name} {p.id === selfId && <span className="text-zinc-500 text-[9px]">(YOU)</span>}
                  </span>
                  <span className="text-[9px] font-black tracking-widest text-emerald-400">READY</span>
                </div>
              ))}
              {/* Empty placeholder slots */}
              {Array.from({ length: Math.max(0, roomSize - players.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="flex items-center justify-between px-5 py-3 rounded-2xl border border-dashed border-zinc-800">
                  <span className="font-black text-zinc-700 tracking-widest uppercase text-sm animate-pulse">WAITING...</span>
                  <span className="text-[9px] font-black tracking-widest text-zinc-700">EMPTY</span>
                </div>
              ))}
            </div>

            {isHost ? (
              <button
                onClick={onStart}
                disabled={players.length < 2}
                className={`w-full p-4 rounded-2xl font-black uppercase tracking-widest text-sm border transition-all flex items-center justify-center gap-3 ${
                  players.length >= 2
                    ? `bg-white/10 ${theme.borderHalf} text-white hover:bg-white/15 ${theme.glow}`
                    : 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
                }`}
              >
                <Play size={18} style={players.length >= 2 ? accent : undefined} /> {players.length >= 2 ? 'START RACE' : 'NEED 2+ PLAYERS'}
              </button>
            ) : (
              <p className="text-center text-zinc-500 text-xs font-black tracking-widest animate-pulse py-3">WAITING FOR HOST TO START...</p>
            )}

            <button onClick={onLeave} className="w-full p-3 rounded-2xl font-black uppercase tracking-widest text-[10px] text-zinc-500 hover:text-red-400 transition-colors flex items-center justify-center gap-2">
              <LogOut size={12} /> LEAVE ROOM
            </button>
          </div>
        )}

        {/* ── RESULTS ────────────────────────────────────────────── */}
        {status === 'finished' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-2 text-white font-black tracking-widest text-sm uppercase mb-1">
              <Flag size={16} style={accent} /> Final Ranking
            </div>
            {ranking.map((p, idx) => (
              <div key={p.id} className={`flex items-center justify-between px-5 py-4 rounded-2xl border ${p.id === selfId ? `bg-white/5 ${theme.borderHalf}` : 'bg-zinc-900/50 border-zinc-800'}`}>
                <div className="flex items-center gap-4">
                  <span className={`font-black text-2xl ${idx === 0 ? theme.text : 'text-zinc-500'}`}>#{idx + 1}</span>
                  <span className="font-black text-white tracking-widest uppercase">{p.name}{p.id === selfId ? ' (YOU)' : ''}</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className={`font-black text-2xl ${theme.text}`}>{p.finishWpm}</span>
                  <span className="text-[10px] font-bold text-zinc-500">{p.finishAcc}% · {((p.finishMs ?? 0) / 1000).toFixed(1)}s</span>
                </div>
              </div>
            ))}
            {unfinished.length > 0 && (
              <p className="text-center text-zinc-600 text-[10px] font-black tracking-widest">{unfinished.map(p => p.name).join(', ')} did not finish</p>
            )}
            <button onClick={onLeave} className="w-full p-4 rounded-2xl font-black uppercase tracking-widest text-sm bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all">
              LEAVE ROOM
            </button>
          </div>
        )}

        {/* ── RACING (modal opened mid-race) ─────────────────────── */}
        {status === 'racing' && (
          <p className="text-center text-zinc-500 text-xs font-black tracking-widest py-6 animate-pulse">RACE IN PROGRESS — TYPE!</p>
        )}
      </div>
    </div>
  );
};

