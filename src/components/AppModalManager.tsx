import { memo } from 'react';
import {
  X, Trophy, Lock, Keyboard, Terminal, Zap, Star, RotateCcw, Skull,
  Rocket, Crosshair, Shield, EyeOff, Gauge, Flame, Crown, Palette,
  Swords, Sword, Sparkles, Orbit, Unlock, CalendarCheck, Hourglass
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { StatsDashboard } from '@/components/StatsDashboard';
import { DailyQuestsPanel } from '@/components/DailyQuestsPanel';
import { SocialModal } from '@/components/SocialModal';
import { ChangelogModal } from '@/components/ChangelogModal';
import { SettingsModal } from '@/components/SettingsModal';
import { PlayerProfileModal } from '@/components/PlayerProfileModal';
import { BugReportsModal } from '@/components/BugReportsModal';
import { CommsModal } from '@/components/CommsModal';
import { GhostPacerModal } from '@/components/GhostPacerModal';
import { AIChatBot, type AruStats } from '@/components/AIChatBot';
import { type PaceSample } from '@/components/TypingArea';
import { ACHIEVEMENTS, type Theme, type SoundProfile } from '@/data/constants';
import type { useGameConfig } from '@/hooks/useGameConfig';
import type { useTypingEngine } from '@/hooks/useTypingEngine';
import type { useRPGSystem } from '@/hooks/useRPGSystem';
import type { useQuests } from '@/hooks/useQuests';
import type { useRace } from '@/hooks/useRace';
import type { useFriends } from '@/hooks/useFriends';
import type { useChallenges } from '@/hooks/useChallenges';

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  'zap': Zap,
  'rocket': Rocket,
  'crosshair': Crosshair,
  'shield': Shield,
  'skull': Skull,
  'eye-off': EyeOff,
  'gauge': Gauge,
  'flame': Flame,
  'star': Star,
  'crown': Crown,
  'palette': Palette,
  'swords': Swords,
  'sword': Sword,
  'sparkles': Sparkles,
  'orbit': Orbit,
  'unlock': Unlock,
  'rotate-ccw': RotateCcw,
  'calendar-check': CalendarCheck,
  'hourglass': Hourglass,
};

import type { CuratedWallpaper } from '@/hooks/useWallpaperTheme';

interface AppModalManagerProps {
  activeModal: string | null;
  theme: Theme;
  themeIndex: number;
  soundProfile: SoundProfile;
  themeFont: string;
  wallpaperUrl: string | null;
  wallpaperTheme: Theme | null;
  brightness?: number;
  setBrightness?: (val: number) => void;
  blur?: number;
  setBlur?: (val: number) => void;
  customAccent?: string;
  setCustomAccent?: (accent: string) => void;
  selectCuratedWallpaper?: (preset: CuratedWallpaper) => void;
  handleFileUpload: (file: File) => void;
  clearWallpaper: () => void;
  isLoggedIn: boolean;
  cloud: {
    username: string | null;
    status: string;
    elo: number;
  };
  supabase: SupabaseClient | null;
  auth: {
    session: { user: { id: string } } | null;
    signOut: () => Promise<void>;
  };
  game: ReturnType<typeof useGameConfig>;
  typing: ReturnType<typeof useTypingEngine>;
  rpg: ReturnType<typeof useRPGSystem>;
  quests: ReturnType<typeof useQuests>;
  race: ReturnType<typeof useRace>;
  friendsState: ReturnType<typeof useFriends>;
  challenges: ReturnType<typeof useChallenges>;
  dailyStreak: number;
  pbGhost: { wpm: number; samples: PaceSample[] } | null;
  initialRaceCode?: string;
  isRankedMatch?: boolean;
  selectedProfileUsername: string | null;
  tetrisEffect: boolean;
  isAruOpen: boolean;
  shouldHideClutter: boolean;
  nameInput: string;
  nameErr: string;
  savingName: boolean;
  localRPGStatsMemo?: any;
  aruStats?: AruStats;
  techAiState?: any;
  techModifiersMemo?: any;
  techCapabilities?: any;
  // Handlers
  onCloseModal: () => void;
  onSelectTheme: (idx: number) => void;
  onSelectSoundProfile: (prof: SoundProfile) => void;
  onSetThemeFont: (font: string) => void;
  onStartWeaknessDrill: (drillText: string) => void;
  onChallengeFriend: (uname: string) => void;
  onOpenProfile: (username: string) => void;
  onCloseProfile: () => void;
  onRaceCreate: (name: string, size?: number, isRanked?: boolean, roomCode?: string) => void;
  onRaceJoin: (code: string, name: string, isRanked?: boolean) => void;
  onRaceStart: () => void;
  onRaceLeave: () => void;
  onSetTetrisEffect: (v: boolean) => void;
  onToggleAru: () => void;
  onCloseAru: () => void;
  onStartSmartDrill: (keys?: string[]) => void;
  onSetNameInput: (v: string) => void;
  onSetNameErr: (v: string) => void;
  onSubmitUsername: () => void;
}

export const AppModalManager = memo(function AppModalManager({
  activeModal,
  theme,
  themeIndex,
  soundProfile,
  themeFont,
  wallpaperUrl,
  wallpaperTheme,
  brightness,
  setBrightness,
  blur,
  setBlur,
  customAccent,
  setCustomAccent,
  selectCuratedWallpaper,
  handleFileUpload,
  clearWallpaper,
  isLoggedIn,
  cloud,
  supabase,
  auth,
  game,
  typing,
  rpg,
  quests,
  race: _race,
  friendsState,
  challenges,
  dailyStreak,
  pbGhost,
  initialRaceCode: _initialRaceCode,
  isRankedMatch: _isRankedMatch,
  selectedProfileUsername,
  tetrisEffect,
  isAruOpen,
  shouldHideClutter,
  nameInput,
  nameErr,
  savingName,
  localRPGStatsMemo,
  aruStats,
  techAiState,
  techModifiersMemo,
  techCapabilities,
  onCloseModal,
  onSelectTheme,
  onSelectSoundProfile,
  onSetThemeFont,
  onStartWeaknessDrill,
  onChallengeFriend,
  onOpenProfile,
  onCloseProfile,
  onRaceCreate: _onRaceCreate,
  onRaceJoin: _onRaceJoin,
  onRaceStart: _onRaceStart,
  onRaceLeave: _onRaceLeave,
  onSetTetrisEffect,
  onCloseAru,
  onStartSmartDrill,
  onSetNameInput,
  onSetNameErr,
  onSubmitUsername,
}: AppModalManagerProps) {
  return (
    <>
      {/* ═══ OVERLAY MODALS ═══ */}
      {/* Ready Modal */}
      {typing.phase === 'READY' && (
        <div key="ready-modal" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl flex flex-col gap-6 w-full max-w-md lucid-scale" style={{ '--delay': '0ms' } as React.CSSProperties}>
            <div className="flex justify-center mb-2"><Keyboard className={theme.text} size={48} /></div>
            <div className="flex justify-between items-center bg-zinc-900 p-5 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer" onClick={() => { typing.setPhase('COUNTDOWN'); typing.setCountdownTimer(5); }}>
              <span className="text-white font-black tracking-widest text-sm">NORMAL MODE</span>
              <span className="px-4 py-2 bg-zinc-800 rounded-lg text-xs font-black text-zinc-400 shadow-inner">ENTER</span>
            </div>
            <div className="flex justify-between items-center bg-zinc-900 p-5 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer" onClick={() => { game.setZenMode(true); typing.setPhase('COUNTDOWN'); typing.setCountdownTimer(5); }}>
              <span className="text-white font-black tracking-widest text-sm">ZEN MODE</span>
              <div className="flex gap-2">
                <span className="px-4 py-2 bg-zinc-800 rounded-lg text-xs font-black text-zinc-400 shadow-inner">SHIFT</span>
                <span className="text-zinc-600 font-black text-xs self-center">+</span>
                <span className="px-4 py-2 bg-zinc-800 rounded-lg text-xs font-black text-zinc-400 shadow-inner">ENTER</span>
              </div>
            </div>
            <p className="text-center text-zinc-600 text-[10px] font-bold uppercase tracking-widest mt-2">Press ESC to configure</p>
          </div>
        </div>
      )}

      {/* Countdown */}
      {typing.phase === 'COUNTDOWN' && (
        <div key="countdown-modal" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-md animate-in fade-in duration-300 pointer-events-none">
          <span className={`text-[12rem] font-black ${theme.text} caret-lucid drop-shadow-2xl`}>{typing.countdownTimer}</span>
        </div>
      )}

      {/* Achievement Toast */}
      {rpg.achievementQueue.length > 0 && (() => {
        const ToastIcon = ACHIEVEMENT_ICONS[rpg.achievementQueue[0].icon] ?? Trophy;
        return (
          <div className="fixed top-6 right-6 z-[600] animate-in slide-in-from-top fade-in duration-300">
            <div className={`bg-zinc-950/90 backdrop-blur-md border ${theme.borderHalf} rounded-2xl p-4 ${theme.toastGlow} flex items-center gap-4 min-w-[300px] lucid-slide`} style={{ '--delay': '0ms' } as React.CSSProperties}>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10" style={{ color: `rgb(${theme.glowPrimary})` }}>
                <ToastIcon size={26} className={theme.drop} />
              </div>
              <div>
                <div className={`text-[10px] font-black uppercase tracking-widest ${theme.text}`}>Achievement Unlocked</div>
                <div className="text-white font-bold text-lg">{rpg.achievementQueue[0].title}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* First-login: choose a leaderboard display name */}
      {cloud.status === 'needs-username' && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 w-full max-w-md shadow-2xl lucid-scale" style={{ '--delay': '0ms' } as React.CSSProperties}>
            <div className="flex justify-center mb-4"><Trophy className={theme.text} size={40} /></div>
            <h2 className="text-2xl font-black text-white text-center tracking-widest uppercase mb-2">Choose your name</h2>
            <p className="text-center text-zinc-500 text-xs font-bold mb-6">This is how you'll appear on the leaderboard. Progress on this device will sync to your account.</p>
            <input
              type="text"
              value={nameInput}
              onChange={e => { onSetNameInput(e.target.value); onSetNameErr(''); }}
              onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter' && !savingName) onSubmitUsername(); }}
              placeholder="ENTER NAME..."
              maxLength={12}
              autoFocus
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-6 py-4 text-white font-black text-xl uppercase text-center focus:outline-none focus:border-white/30 placeholder:text-zinc-600"
            />
            {nameErr && <p className="text-red-400 text-xs font-black tracking-widest text-center mt-3 uppercase">{nameErr}</p>}
            <button
              onClick={onSubmitUsername}
              disabled={savingName}
              className={`w-full mt-5 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-black tracking-widest rounded-2xl transition-all disabled:opacity-50 cursor-pointer ${theme.text}`}
            >
              {savingName ? 'SAVING…' : 'CONTINUE'}
            </button>
            <button
              onClick={() => { void auth.signOut(); }}
              className="w-full mt-2 px-4 py-2 text-zinc-500 hover:text-zinc-300 text-[10px] font-black tracking-widest uppercase transition-colors cursor-pointer"
            >
              Cancel & sign out
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL LAYER ─── */}
      {(() => {
        if (!activeModal) return null;
        switch (activeModal) {
          case 'expandedGraph': return (
            <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-6 backdrop-blur-md animate-in fade-in duration-300" onClick={onCloseModal}>
              <div className="bg-zinc-900/95 p-8 rounded-3xl w-full max-w-4xl border border-zinc-800 shadow-2xl lucid-scale" style={{ '--delay': '0ms' } as React.CSSProperties} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className={`text-2xl font-black ${theme.text}`}>PACING TIMELINE</h3>
                  <button onClick={onCloseModal} className="text-zinc-400 hover:text-white transition-colors cursor-pointer"><X size={24} /></button>
                </div>
                <svg viewBox="0 0 800 240" className="w-full h-64 bg-zinc-950/50 rounded-2xl p-4 border border-zinc-800">
                  {[0, 20, 40, 60, 80, 100].map((x) => (
                    <line key={`grid-v-${x}`} x1={x * 8} y1="0" x2={x * 8} y2="200" stroke="rgba(113, 113, 122, 0.1)" strokeWidth="1" />
                  ))}
                  {[0, 50, 100, 150, 200].map((y) => (
                    <line key={`grid-h-${y}`} x1="0" y1={y} x2="800" y2={y} stroke="rgba(113, 113, 122, 0.1)" strokeWidth="1" />
                  ))}
                  {(() => {
                    const pts = typing.timelinePoints.length ? typing.timelinePoints : [];
                    if (pts.length === 0) return null;
                    const maxW = Math.max(...pts.map(p => p.wpm).concat([typing.wpm || 1, 10]));
                    const poly = pts.map((p, i) => {
                      const x = ((i + 1) / pts.length) * 760 + 20;
                      const y = 200 - Math.min(200, (p.wpm / Math.max(maxW, 10)) * 160);
                      return `${x},${y}`;
                    }).join(' ');
                    return <polyline fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={poly} className={theme.text} />;
                  })()}
                </svg>
                <div className="grid grid-cols-5 gap-2 mt-6">
                  {typing.timelinePoints.map((p, i) => (
                    <div key={i} className="bg-zinc-800/50 p-3 rounded-lg text-center border border-zinc-700">
                      <div className={`font-black text-lg ${theme.text}`}>{p.wpm} wpm</div>
                      <div className="text-[10px] text-zinc-500 font-black">+{Math.round((p.t) / 1000)}s</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 text-center text-sm text-zinc-500 font-black">Click outside to close</div>
              </div>
            </div>
          );

          case 'stats': return (
            <StatsDashboard
              theme={theme}
              testsCompleted={rpg.testsCompleted}
              heatmapData={rpg.heatmapData}
              onClose={onCloseModal}
              onStartWeaknessDrill={onStartWeaknessDrill}
            />
          );

          case 'quests': return (
            <DailyQuestsPanel
              questsState={quests.questsState}
              dailyStreak={dailyStreak}
              onClose={onCloseModal}
            />
          );

          case 'race': return null;

          case 'social': return (
            <SocialModal
              theme={theme}
              onClose={onCloseModal}
              friendsState={friendsState}
              onChallengeFriend={onChallengeFriend}
              sentChallengeTo={challenges.sentChallengeTo}
              onOpenProfile={onOpenProfile}
              supabase={supabase}
            />
          );

          case 'changelog': return (
            <ChangelogModal
              theme={theme}
              onClose={onCloseModal}
            />
          );

          case 'settings': return (
            <SettingsModal
              theme={theme}
              onClose={onCloseModal}
              suddenDeath={game.suddenDeath} setSuddenDeath={game.setSuddenDeath}
              ghostPacer={game.ghostPacer} setGhostPacer={game.setGhostPacer}
              focusMode={game.focusMode} setFocusMode={game.setFocusMode}
              blindMode={game.blindMode} setBlindMode={game.setBlindMode}
              mirroredMode={game.mirroredMode} toggleMirror={game.toggleMirror}
              fogMode={game.fogMode} setFogMode={game.setFogMode}
              stickyKeysMode={game.stickyKeysMode} setStickyKeysMode={game.setStickyKeysMode}
              overclockedMode={game.overclockedMode} setOverclockedMode={game.setOverclockedMode}
              zenMode={game.zenMode} setZenMode={game.setZenMode}
              themeIndex={themeIndex} selectTheme={onSelectTheme}
              soundProfile={soundProfile} selectSoundProfile={onSelectSoundProfile}
              themeFont={themeFont}
              setThemeFont={onSetThemeFont}
              wallpaperUrl={wallpaperUrl}
              wallpaperTheme={wallpaperTheme}
              brightness={brightness}
              setBrightness={setBrightness}
              blur={blur}
              setBlur={setBlur}
              customAccent={customAccent}
              setCustomAccent={setCustomAccent}
              selectCuratedWallpaper={selectCuratedWallpaper}
              handleFileUpload={handleFileUpload}
              clearWallpaper={clearWallpaper}
            />
          );

          case 'profile': return (
            <PlayerProfileModal
              targetUsername={selectedProfileUsername}
              onClose={onCloseProfile}
              supabase={supabase}
              localUsername={cloud.username}
              theme={theme}
              localRPGStats={localRPGStatsMemo}
            />
          );

          case 'godMode': return (
            <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 lucid-scale" style={{ '--delay': '0ms' } as React.CSSProperties} onClick={onCloseModal}>
              <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 md:p-12 w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-6">
                  <h2 className="text-3xl font-black text-white uppercase tracking-widest flex items-center"><Terminal className="mr-4 text-emerald-400" size={32} /> God Mode</h2>
                  <button onClick={onCloseModal} className="p-3 bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 rounded-full text-zinc-400 transition-all duration-200 border border-zinc-700 hover:border-red-500/50 cursor-pointer"><X size={24} /></button>
                </div>
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 shadow-inner">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${tetrisEffect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                        <Zap size={20} />
                      </div>
                      <div>
                        <h4 className="text-white font-bold tracking-widest uppercase mb-1">Tetris Effect Particles</h4>
                        <p className="text-xs text-zinc-500 font-bold">Auto-unlocks at 50 combo. Toggle here to test early.</p>
                      </div>
                    </div>
                    <button onClick={() => onSetTetrisEffect(!tetrisEffect)} className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all duration-300 cursor-pointer ${tetrisEffect ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                      {tetrisEffect ? 'ON ✓' : 'OFF'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <button onClick={() => { rpg.unlockAllAchievements(); onCloseModal(); }} className="p-6 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-3xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.1)] transition-all flex flex-col items-center text-center text-xs cursor-pointer">
                      <Trophy size={24} className="mb-2" /> Unlock All Achievements
                    </button>
                    <button onClick={() => { rpg.setXp(250000); onCloseModal(); }} className="p-6 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-3xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(14,165,233,0.1)] transition-all flex flex-col items-center text-center text-xs cursor-pointer">
                      <Star size={24} className="mb-2" /> Set Level to Max (50+)
                    </button>
                  </div>

                  {/* Admin Bug Reports Button */}
                  <div className="mt-4">
                    <button 
                      onClick={() => onOpenProfile('bugReports')} // handled by activeModal switcher
                      className="w-full p-6 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-3xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all flex items-center justify-center gap-3 text-xs cursor-pointer"
                    >
                      <Terminal size={24} /> Open Admin Bug Reports Inbox
                    </button>
                  </div>

                  <div className="mt-4 p-6 bg-red-500/5 border border-red-500/20 rounded-3xl">
                    <h4 className="text-red-400 font-bold tracking-widest uppercase mb-3 text-xs flex items-center gap-2">
                      <RotateCcw size={16} /> DANGER ZONE
                    </h4>
                    <button onClick={() => { rpg.resetAllProgress(); onCloseModal(); }} className="w-full p-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 text-xs hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] cursor-pointer">
                      <RotateCcw size={18} /> Reset All Progress (Level, XP, Achievements, Themes)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );

          case 'bugReports': return (
            <BugReportsModal 
              supabase={supabase} 
              onClose={onCloseModal} 
            />
          );

          case 'comms': return isLoggedIn ? (
            <CommsModal
              supabase={supabase}
              userId={auth.session?.user.id}
              friends={friendsState.friends}
              onClose={onCloseModal}
            />
          ) : null;

          case 'trophy': return (
            <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={onCloseModal}>
              <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 md:p-12 w-full max-w-5xl shadow-2xl max-h-[90vh] overflow-y-auto lucid-scale" style={{ '--delay': '0ms' } as React.CSSProperties} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-10 border-b border-zinc-800 pb-6 sticky top-0 bg-zinc-950/90 backdrop-blur-md z-10">
                  <h2 className="text-3xl font-black text-white uppercase tracking-widest flex items-center"><Trophy className="mr-4 text-amber-400" size={32} /> Hall of Legends</h2>
                  <button onClick={onCloseModal} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"><X size={24} /></button>
                </div>
                <div className="flex flex-col gap-12">
                  {(['SKILL', 'HARDCORE', 'GRIND', 'SUPER'] as const).map(category => {
                    const categoryAchievements = ACHIEVEMENTS.filter(a => a.category === category);
                    return (
                      <div key={category}>
                        <h3 className={`text-sm font-black uppercase tracking-widest mb-6 ${category === 'SUPER' ? theme.text : 'text-zinc-500'}`}>{category} BADGES</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {categoryAchievements.map(ach => {
                            const isUnlocked = rpg.unlockedAchievements.includes(ach.id);
                            const AchIcon = ACHIEVEMENT_ICONS[ach.icon] ?? Trophy;
                            return (
                              <div key={ach.id} className={`p-5 rounded-3xl border transition-all flex flex-col items-center text-center ${isUnlocked ? `bg-zinc-900 ${theme.borderHalf} ${theme.auraLow} hover:-translate-y-1` : 'bg-zinc-950 border-zinc-800/50 opacity-60 grayscale'}`}>
                                <div className="relative mb-4">
                                  <AchIcon
                                    size={34}
                                    className={isUnlocked ? theme.drop : 'text-zinc-600'}
                                    style={isUnlocked ? { color: `rgb(${theme.glowPrimary})` } : undefined}
                                  />
                                  {!isUnlocked && <div className="absolute -bottom-2 -right-2 bg-zinc-800 rounded-full p-1"><Lock size={12} className="text-zinc-400" /></div>}
                                </div>
                                <h4 className={`font-bold mb-2 ${isUnlocked ? 'text-white' : 'text-zinc-500'}`}>{ach.title}</h4>
                                <p className="text-[10px] text-zinc-400 leading-relaxed font-semibold">{ach.desc}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );

          case 'ghost': return (
            <GhostPacerModal
              isOpen={activeModal === 'ghost'}
              onClose={onCloseModal}
              ghostPacer={game.ghostPacer}
              setGhostPacer={game.setGhostPacer}
              ghostMode={game.ghostMode}
              setGhostMode={game.setGhostMode}
              ghostTargetWpm={game.ghostTargetWpm}
              setGhostTargetWpm={game.setGhostTargetWpm}
              pbGhost={pbGhost}
              theme={theme}
            />
          );

          default: return null;
        }
      })()}

      {/* Ask Aru AI Drawer */}
      <AIChatBot
        stats={aruStats}
        onStartDrill={onStartSmartDrill}
        hideTrigger={shouldHideClutter}
        theme={theme}
        isOpen={isAruOpen}
        onClose={onCloseAru}
        techAiState={techAiState}
        techModifiers={techModifiersMemo}
        techCapabilities={techCapabilities}
      />
    </>
  );
});
