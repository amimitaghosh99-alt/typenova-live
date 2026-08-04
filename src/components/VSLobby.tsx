import { useState } from 'react';
import { Users, Copy, Check, Play, Crown, LogOut, Swords, Link, Sparkles } from 'lucide-react';
import type { RacerState, RaceStatus, RaceConfig } from '../hooks/useRace';
import { PostMatchChat } from './PostMatchChat';

interface VSLobbyProps {
  status: RaceStatus;
  code: string;
  isHost: boolean;
  players: RacerState[];
  error: string;
  countdown: number | null;
  roomSize?: number;
  lobbyConfig?: RaceConfig;
  username: string;
  onCreateRoom: (username: string) => void;
  onJoinRoom: (code: string, username: string) => void;
  onStartRace: () => void;
  onLeaveRoom: () => void;
  onUpdateLobbyConfig?: (config: Partial<RaceConfig>) => void;
}

export function VSLobby({
  status,
  code,
  isHost,
  players,
  error,
  countdown,
  roomSize = 4,
  username,
  onCreateRoom,
  onJoinRoom,
  onStartRace,
  onLeaveRoom,
}: VSLobbyProps) {
  const [nameInput, setNameInput] = useState(username || '');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const canAct = (username || nameInput.trim()).length > 0;
  const activeName = username || nameInput.trim() || 'Racer';

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    if (!code) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto font-mono text-white p-4 sm:p-6">
      {/* Glow Backdrops */}
      <div className="relative">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Error Banner */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold text-center animate-in fade-in">
            ⚠️ {error.toUpperCase()}
          </div>
        )}

        {/* ── IDLE / JOINING STATE: Create or Join ─────────────────── */}
        {(status === 'idle' || status === 'joining') && (
          <div className="glass-panel relative rounded-2xl border border-white/15 bg-slate-950/80 p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Swords size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">TypeNova Socket Arena</h2>
                <p className="text-xs text-zinc-400">Authoritative Real-Time Multiplayer Referee</p>
              </div>
            </div>

            <div className="space-y-4">
              {!username && (
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter your pilot callsign..."
                    maxLength={15}
                    className="w-full bg-slate-900/80 border border-white/15 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/40"
                  />
                </div>
              )}

              {/* Create Room Option */}
              <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10 space-y-3">
                <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={14} /> Host New Match
                </h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Generate a 6-character room code and host up to 4 racers in an authoritative Socket.io arena.
                </p>
                <button
                  onClick={() => canAct && onCreateRoom(activeName)}
                  disabled={!canAct || status === 'joining'}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-extrabold text-xs tracking-wider border border-cyan-400 hover:scale-[1.01] active:scale-100 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Users size={16} />
                  {status === 'joining' ? 'INITIALIZING LOBBY...' : 'CREATE PRIVATE LOBBY'}
                </button>
              </div>

              <div className="flex items-center gap-3 text-zinc-500 text-[10px] font-bold tracking-widest my-2">
                <div className="flex-1 h-px bg-white/10" /> OR JOIN EXISTING LOBBY <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Join Room Option */}
              <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10 space-y-3">
                <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                  Join via Room Code
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="X7K9P2"
                    maxLength={6}
                    className="w-36 bg-slate-950 border border-white/15 rounded-xl px-3 py-3 text-center text-sm font-extrabold tracking-[0.25em] text-white uppercase placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/40"
                  />
                  <button
                    onClick={() => canAct && joinCodeInput.trim().length === 6 && onJoinRoom(joinCodeInput.trim(), activeName)}
                    disabled={!canAct || joinCodeInput.trim().length !== 6 || status === 'joining'}
                    className="flex-1 py-3 rounded-xl bg-slate-900 border border-purple-500/40 text-purple-300 hover:bg-slate-800 font-extrabold text-xs tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {status === 'joining' ? 'CONNECTING...' : 'JOIN ROOM'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── LOBBY STATE: Room Code, Players, Countdown, Chat ──────── */}
        {(status === 'lobby' || status === 'racing' || status === 'finished') && (
          <div className="space-y-6">
            {/* Header & Code Banner */}
            <div className="glass-panel rounded-2xl border border-white/15 bg-slate-950/80 p-5 md:p-6 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">ROOM ACCESS CODE</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-cyan-300 tracking-[0.3em] font-mono">
                      {code}
                    </span>
                    <button
                      onClick={copyCode}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all"
                      title="Copy Room Code"
                    >
                      {copiedCode ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                    <button
                      onClick={copyLink}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all flex items-center gap-1"
                      title="Copy Direct Link"
                    >
                      {copiedLink ? <Check size={16} className="text-emerald-400" /> : <Link size={16} />}
                      <span className="text-[10px] font-bold hidden sm:inline">LINK</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={onLeaveRoom}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 transition-all flex items-center gap-2"
                >
                  <LogOut size={14} /> LEAVE LOBBY
                </button>
              </div>

              {/* Countdown Alert Display */}
              {typeof countdown === 'number' && countdown > 0 && (
                <div className="p-4 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-center animate-pulse">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                    Race Starting In
                  </span>
                  <span className="text-4xl font-black text-cyan-300">
                    {countdown}
                  </span>
                </div>
              )}

              {/* Players Grid (Up to 4 Players) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span>RACERS IN LOBBY</span>
                  <span className="text-cyan-300">{players.length} / {roomSize} MAX</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {players.map((p) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border font-mono transition-all ${
                        p.name?.toLowerCase() === activeName.toLowerCase()
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-white'
                          : 'bg-slate-900/60 border-white/10 text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 text-xs font-bold uppercase">
                          {p.name ? p.name.charAt(0) : 'P'}
                        </div>
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            {p.isHost && <Crown size={14} className="text-amber-400" />}
                            {p.name}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {p.wpm > 0 ? `${p.wpm} WPM` : 'Ready to race'}
                          </div>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        p.finished
                          ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      }`}>
                        {p.finished ? `#${p.rank || 1} FINISHED` : 'READY'}
                      </span>
                    </div>
                  ))}

                  {/* Empty Slot Fillers */}
                  {Array.from({ length: Math.max(0, roomSize - players.length) }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-dashed border-white/10 bg-slate-900/20 text-zinc-600 font-mono"
                    >
                      <span className="text-xs font-bold animate-pulse">WAITING FOR PLAYER...</span>
                      <span className="text-[10px] font-bold">SLOT OPEN</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Host Start Race Action Button */}
              {isHost ? (
                <button
                  onClick={onStartRace}
                  disabled={players.length < 1 || (typeof countdown === 'number' && countdown > 0)}
                  className={`w-full py-3.5 rounded-xl font-black text-xs tracking-wider border transition-all flex items-center justify-center gap-2 ${
                    players.length >= 1 && (!countdown || countdown <= 0)
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-black border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-[1.01] active:scale-100'
                      : 'bg-slate-900/40 border-white/5 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  <Play size={16} fill="currentColor" />
                  {typeof countdown === 'number' && countdown > 0
                    ? `STARTING IN ${countdown}s...`
                    : 'START RACE NOW'}
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/50 border border-white/10 text-center text-xs font-bold text-zinc-400 animate-pulse">
                  ⏳ Waiting for lobby host to start the race...
                </div>
              )}
            </div>

            {/* Comms Terminal (Socket Chat) */}
            <PostMatchChat
              lobbyId={code}
              username={activeName}
              players={players}
            />
          </div>
        )}
      </div>
    </div>
  );
}
