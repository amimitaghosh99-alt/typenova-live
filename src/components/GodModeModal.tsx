import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Terminal, X, Zap, Trophy, Flame,
  RotateCcw, Sliders, Volume2, Sparkles, Copy, Check,
  Bot, FastForward, Play, Square, Unlock,
  Layers, Activity, History, AlertTriangle
} from 'lucide-react';
import type { Theme, SoundProfile } from '@/data/constants';
import { ACHIEVEMENTS } from '@/data/constants';
import { HEX_ABILITIES, type HexType } from '@/lib/sabotageEngine';
import { generateRandomArtisan, saveArtisanConfig } from '@/data/artisanCustomizer';
import { toast } from 'sonner';

export type GodModeTab = 'simulator' | 'combat' | 'unlocks' | 'audio' | 'state';

export interface GodModeModalProps {
  theme: Theme;
  soundProfile: SoundProfile;
  tetrisEffect: boolean;
  onSetTetrisEffect: (v: boolean) => void;
  rpg: {
    xp: number;
    setXp: (xp: number | ((prev: number) => number)) => void;
    unlockAllAchievements: () => void;
    resetAllProgress: () => void;
    userLevel?: number;
    hydrate?: (snapshot: any) => void;
  };
  typing?: {
    phase?: string;
    targetText?: string;
    input?: string;
    setInputSync?: (val: string | ((prev: string) => string)) => void;
    setPhase?: (phase: any) => void;
    setStartTime?: (time: number) => void;
    setCombo?: (val: number | ((prev: number) => number)) => void;
    finishTestImpl?: (finalTimestamp: number, finalInput?: string | null) => void;
  };
  onClose: () => void;
  onOpenModal: (key: any) => void;
  onSelectSoundProfile: (prof: SoundProfile) => void;
  onPlayPreviewSound?: (profileKey?: string) => void;
  onTriggerTestHex?: (hexType: HexType) => void;
  onClearTestHexes?: () => void;
  onSetTestHexEnergy?: (energy: number) => void;
  isBotRunning?: boolean;
  onToggleBot?: (wpm: number, accuracy: number) => void;
  onInstantFinish?: (wpm: number, accuracy: number) => void;
}

const SOUND_PROFILES: { key: SoundProfile; name: string; desc: string }[] = [
  { key: 'thocky', name: 'Thocky', desc: 'Lubed Holy Panda switches with deep acoustic dampening' },
  { key: 'linear', name: 'Linear', desc: 'Smooth Cherry MX Red switches with quiet bottom-out' },
  { key: 'clicky', name: 'Clicky', desc: 'Crisp tactile Cherry MX Blue click-leaf sound' },
  { key: 'raindrops', name: 'Raindrops', desc: 'Soft organic raindrop acoustics on acoustic mats' },
  { key: 'arcade', name: 'Arcade', desc: 'Chiptune 8-bit retro mechanical arcade switches' },
  { key: 'modelm', name: 'Model M', desc: 'Buckling spring mechanical clatter with metal plate resonance' },
  { key: 'alpaca', name: 'Alpaca', desc: 'Custom nylon linear switches with silent bottoming' },
];

export const GodModeModal = React.memo(function GodModeModal({
  theme,
  soundProfile,
  tetrisEffect,
  onSetTetrisEffect,
  rpg,
  typing,
  onClose,
  onOpenModal,
  onSelectSoundProfile,
  onPlayPreviewSound,
  onTriggerTestHex,
  onClearTestHexes,
  onSetTestHexEnergy,
  isBotRunning = false,
  onToggleBot,
  onInstantFinish,
}: GodModeModalProps) {
  const [activeTab, setActiveTab] = useState<GodModeTab>('simulator');

  // Simulator tab state
  const [botWpm, setBotWpm] = useState<number>(120);
  const [botAcc, setBotAcc] = useState<number>(98);
  const [finishWpm, setFinishWpm] = useState<number>(145);
  const [finishAcc, setFinishAcc] = useState<number>(100);

  // Unlocks custom level
  const [customLevel, setCustomLevel] = useState<number>(50);

  // State Surgery state
  const [jsonCopied, setJsonCopied] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [showImportBox, setShowImportBox] = useState<boolean>(false);

  // Backup snapshot detection
  const [hasBackup, setHasBackup] = useState<boolean>(() => {
    return typeof window !== 'undefined' && !!localStorage.getItem('typenova_godmode_backup');
  });

  // Master Unlock Action
  const handleMasterUnlock = useCallback(() => {
    // 0. Auto-snapshot pre-unlock state for 1-click Revert if not already backed up
    try {
      if (!localStorage.getItem('typenova_godmode_backup')) {
        const backup = {
          timestamp: Date.now(),
          typezen_xp: localStorage.getItem('typezen_xp'),
          typezen_tests: localStorage.getItem('typezen_tests'),
          typezen_best_combo: localStorage.getItem('typezen_best_combo'),
          typezen_races_won: localStorage.getItem('typezen_races_won'),
          typezen_daily: localStorage.getItem('typezen_daily'),
          typenova_daily: localStorage.getItem('typenova_daily'),
          typezen_achievements: localStorage.getItem('typezen_achievements'),
          typezen_history: localStorage.getItem('typezen_history'),
          typenova_history: localStorage.getItem('typenova_history'),
          typenova_stats: localStorage.getItem('typenova_stats'),
          typenova_rpg_v2: localStorage.getItem('typenova_rpg_v2'),
          typenova_unlocked_patron_titles: localStorage.getItem('typenova_unlocked_patron_titles'),
          typenova_supporter_entitlements: localStorage.getItem('typenova_supporter_entitlements'),
          typenova_avatar_id: localStorage.getItem('typenova_avatar_id'),
          typenova_banner_id: localStorage.getItem('typenova_banner_id'),
          typenova_active_title: localStorage.getItem('typenova_active_title'),
          tetrisEffect,
        };
        localStorage.setItem('typenova_godmode_backup', JSON.stringify(backup));
        setHasBackup(true);
      }
    } catch {}

    // 1. All achievements
    rpg.unlockAllAchievements();

    // 2. Max Level (50+)
    rpg.setXp(250000);
    rpg.hydrate?.({
      xp: 250000,
      tests: 250,
      achievements: ACHIEVEMENTS.map(a => a.id),
      heatmap: {},
      bestCombo: 250,
    });

    // 3. Inject high-tier personal records into localStorage for banners & titles
    try {
      // Legacy storage keys that useRPGSystem, useRace, and the dossier load on bootstrap
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem('typezen_xp', '250000');
      localStorage.setItem('typezen_tests', '250');
      localStorage.setItem('typezen_best_combo', '250');
      localStorage.setItem('typezen_races_won', '60');
      localStorage.setItem('typezen_daily', JSON.stringify({ lastDay: todayStr, streak: 30 }));
      localStorage.setItem('typenova_daily', JSON.stringify({ lastDay: todayStr, streak: 30 }));
      localStorage.setItem('typezen_achievements', JSON.stringify(ACHIEVEMENTS.map(a => a.id)));

      // Update rpg state with high combo
      const rpgRaw = localStorage.getItem('typenova_rpg_v2');
      const rpgData = rpgRaw ? JSON.parse(rpgRaw) : {};
      rpgData.bestCombo = 250;
      rpgData.xp = 250000;
      rpgData.achievements = ACHIEVEMENTS.map(a => a.id);
      localStorage.setItem('typenova_rpg_v2', JSON.stringify(rpgData));

      // Update stats record (maxWpm = 165, tests = 250, accuracy = 99, consistency = 95, streak = 30, racesWon = 60)
      const statsRaw = localStorage.getItem('typenova_stats');
      const statsData = statsRaw ? JSON.parse(statsRaw) : {};
      statsData.maxWpm = Math.max(statsData.maxWpm || 0, 165);
      statsData.avgAccuracy = 99;
      statsData.avgConsistency = 95;
      statsData.testsCompleted = Math.max(statsData.testsCompleted || 0, 250);
      statsData.racesWon = Math.max(statsData.racesWon || 0, 60);
      statsData.dailyStreak = Math.max(statsData.dailyStreak || 0, 30);
      statsData.bestCombo = Math.max(statsData.bestCombo || 0, 250);
      statsData.totalWordsTyped = Math.max(statsData.totalWordsTyped || 0, 50000);
      localStorage.setItem('typenova_stats', JSON.stringify(statsData));

      // Record verified supporter entitlement so donation security engine authenticates all 4 patron titles
      const masterEntitlement = [{
        name: 'Guest',
        amount: 100,
        currency: 'USD',
        txHash: 'pay_godmode_master_unlock',
        tierId: 'tier_legend',
        date: new Date().toISOString(),
        message: 'God Mode Master Patron Unlock',
      }];
      localStorage.setItem('typenova_supporter_entitlements', JSON.stringify(masterEntitlement));

      // Unlock all Supporter / Patron titles for the complete 24/24 set
      const patronTitles = ['cyber_patron', 'server_sustainer', 'grand_architect', 'eternal_benefactor'];
      localStorage.setItem('typenova_unlocked_patron_titles', JSON.stringify(patronTitles));
      window.dispatchEvent(new CustomEvent('patronTitlesUpdated', { detail: { unlocked: patronTitles } }));

      // Update run history benchmark if needed (uses typezen_history)
      const histRaw = localStorage.getItem('typezen_history') || localStorage.getItem('typenova_history');
      const historyList = histRaw ? JSON.parse(histRaw) : [];
      if (!Array.isArray(historyList) || historyList.length === 0 || !historyList.some(r => r.wpm >= 150)) {
        historyList.push({
          d: new Date().toISOString(),
          wpm: 165,
          acc: 99,
          cons: 95,
          level: 'Master',
          mode: 'words',
          size: 100,
        });
      }
      localStorage.setItem('typezen_history', JSON.stringify(historyList));
      localStorage.setItem('typenova_history', JSON.stringify(historyList));

      // Turn on Tetris particles
      onSetTetrisEffect(true);

      // Trigger global cosmetic, title, and storage listeners
      window.dispatchEvent(new Event('cosmeticsChanged'));
      window.dispatchEvent(new Event('titleChanged'));
      window.dispatchEvent(new Event('storage'));

      toast.success('GOD MODE: 100% UNLOCKED!\nAll Banners, 24 Titles, 20 Badges & Max Level Unlocked', {
        icon: '👑',
        duration: 4000,
      });
    } catch (e) {
      console.error('Master unlock storage write error:', e);
      toast.error('Failed to write master unlock storage');
    }
  }, [rpg, onSetTetrisEffect, tetrisEffect]);

  // Unlock Banners Only
  const handleUnlockBannersOnly = useCallback(() => {
    try {
      // Banners require: Level 50, 100 WPM, 150 WPM, 100 Combo, 200 Combo
      localStorage.setItem('typezen_xp', '250000');
      localStorage.setItem('typezen_best_combo', '220');

      const rpgRaw = localStorage.getItem('typenova_rpg_v2');
      const rpgData = rpgRaw ? JSON.parse(rpgRaw) : {};
      rpgData.bestCombo = Math.max(rpgData.bestCombo || 0, 220);
      rpgData.xp = Math.max(rpgData.xp || 0, 250000);
      localStorage.setItem('typenova_rpg_v2', JSON.stringify(rpgData));

      const histRaw = localStorage.getItem('typezen_history') || localStorage.getItem('typenova_history');
      const historyList = histRaw ? JSON.parse(histRaw) : [];
      historyList.push({
        d: new Date().toISOString(),
        wpm: 165,
        acc: 99,
        cons: 95,
        level: 'Master',
        mode: 'words',
        size: 100,
      });
      localStorage.setItem('typezen_history', JSON.stringify(historyList));
      localStorage.setItem('typenova_history', JSON.stringify(historyList));

      const statsRaw = localStorage.getItem('typenova_stats');
      const statsData = statsRaw ? JSON.parse(statsRaw) : {};
      statsData.maxWpm = Math.max(statsData.maxWpm || 0, 165);
      statsData.bestCombo = Math.max(statsData.bestCombo || 0, 220);
      localStorage.setItem('typenova_stats', JSON.stringify(statsData));

      rpg.setXp(250000);

      window.dispatchEvent(new Event('cosmeticsChanged'));
      window.dispatchEvent(new Event('storage'));
      toast.success('All 5 Milestone Banners Unlocked! (150+ WPM & 200x Combo registered)', { icon: '🚩' });
    } catch {
      toast.error('Failed to unlock banners');
    }
  }, [rpg]);

  // Restore pre-unlock backup
  const handleRestoreBackup = useCallback(() => {
    const raw = localStorage.getItem('typenova_godmode_backup');
    if (!raw) {
      toast.error('No previous backup found');
      return;
    }
    try {
      const b = JSON.parse(raw);
      const restoreKey = (key: string, val: string | null) => {
        if (val === null) localStorage.removeItem(key);
        else localStorage.setItem(key, val);
      };
      restoreKey('typezen_xp', b.typezen_xp);
      restoreKey('typezen_tests', b.typezen_tests);
      restoreKey('typezen_best_combo', b.typezen_best_combo);
      restoreKey('typezen_races_won', b.typezen_races_won);
      restoreKey('typezen_daily', b.typezen_daily);
      restoreKey('typenova_daily', b.typenova_daily);
      restoreKey('typezen_achievements', b.typezen_achievements);
      restoreKey('typezen_history', b.typezen_history);
      restoreKey('typenova_history', b.typenova_history);
      restoreKey('typenova_stats', b.typenova_stats);
      restoreKey('typenova_rpg_v2', b.typenova_rpg_v2);
      restoreKey('typenova_unlocked_patron_titles', b.typenova_unlocked_patron_titles);
      restoreKey('typenova_supporter_entitlements', b.typenova_supporter_entitlements);
      restoreKey('typenova_avatar_id', b.typenova_avatar_id);
      restoreKey('typenova_banner_id', b.typenova_banner_id);
      restoreKey('typenova_active_title', b.typenova_active_title);

      const xp = parseInt(b.typezen_xp || '0', 10) || 0;
      const tests = parseInt(b.typezen_tests || '0', 10) || 0;
      const bestCombo = parseInt(b.typezen_best_combo || '0', 10) || 0;
      const achievements = b.typezen_achievements ? JSON.parse(b.typezen_achievements) : [];
      rpg.hydrate?.({ xp, tests, bestCombo, achievements, heatmap: {} });
      rpg.setXp(xp);

      onSetTetrisEffect(b.tetrisEffect ?? false);
      localStorage.removeItem('typenova_godmode_backup');
      setHasBackup(false);

      window.dispatchEvent(new CustomEvent('patronTitlesUpdated', { detail: { unlocked: b.typenova_unlocked_patron_titles ? JSON.parse(b.typenova_unlocked_patron_titles) : [] } }));
      window.dispatchEvent(new Event('cosmeticsChanged'));
      window.dispatchEvent(new Event('titleChanged'));
      window.dispatchEvent(new Event('storage'));

      toast.success('Restored previous pre-unlock state successfully!', { icon: '↩️' });
    } catch (e) {
      console.error('Failed to restore backup:', e);
      toast.error('Failed to restore previous state');
    }
  }, [rpg, onSetTetrisEffect]);

  // Revert all progress back to Level 1 Novice
  const handleRevertAll = useCallback(() => {
    if (!window.confirm('REVERT ALL: Reset all progress, unlocks, levels, and stats back to Level 1 Novice?')) return;
    try {
      rpg.resetAllProgress();
      rpg.hydrate?.({
        xp: 0,
        tests: 0,
        achievements: [],
        heatmap: {},
        bestCombo: 0,
      });
      localStorage.setItem('typezen_xp', '0');
      localStorage.setItem('typezen_tests', '0');
      localStorage.setItem('typezen_best_combo', '0');
      localStorage.setItem('typezen_achievements', JSON.stringify([]));
      localStorage.removeItem('typezen_heatmap');
      localStorage.removeItem('typezen_history');
      localStorage.removeItem('typenova_history');
      localStorage.removeItem('typezen_races_won');
      localStorage.removeItem('typezen_daily');
      localStorage.removeItem('typenova_daily');
      localStorage.removeItem('typenova_stats');
      localStorage.removeItem('typenova_rpg_v2');
      localStorage.removeItem('typenova_unlocked_patron_titles');
      localStorage.removeItem('typenova_supporter_entitlements');
      localStorage.removeItem('typenova_godmode_backup');
      localStorage.setItem('typenova_avatar_id', 'default');
      localStorage.setItem('typenova_banner_id', 'basic_dark');
      localStorage.setItem('typenova_active_title', 'novice');
      onSetTetrisEffect(false);
      setHasBackup(false);

      window.dispatchEvent(new CustomEvent('patronTitlesUpdated', { detail: { unlocked: [] } }));
      window.dispatchEvent(new Event('cosmeticsChanged'));
      window.dispatchEvent(new Event('titleChanged'));
      window.dispatchEvent(new Event('storage'));
      toast.success('All progress cleanly reverted to Level 1 Novice.', { icon: '🔄' });
    } catch {
      toast.error('Failed to revert progress');
    }
  }, [rpg, onSetTetrisEffect]);

  // Reset Run History only
  const handleResetHistoryOnly = useCallback(() => {
    if (!window.confirm('Clear all typing run history? (Level, XP, and badges will remain intact)')) return;
    try {
      localStorage.removeItem('typezen_history');
      localStorage.removeItem('typenova_history');
      window.dispatchEvent(new Event('storage'));
      toast.success('Run history cleared cleanly.', { icon: '🗑️' });
    } catch {
      toast.error('Failed to clear history');
    }
  }, []);

  // Export save JSON
  const handleExportState = useCallback(() => {
    try {
      const dump = {
        timestamp: Date.now(),
        appVersion: '3.0.1',
        rpg: localStorage.getItem('typenova_rpg_v2') ? JSON.parse(localStorage.getItem('typenova_rpg_v2')!) : null,
        stats: localStorage.getItem('typenova_stats') ? JSON.parse(localStorage.getItem('typenova_stats')!) : null,
        history: localStorage.getItem('typenova_history') ? JSON.parse(localStorage.getItem('typenova_history')!) : [],
        avatarId: localStorage.getItem('typenova_avatar_id') || 'default',
        bannerId: localStorage.getItem('typenova_banner_id') || 'basic_dark',
        tetrisEffect,
      };
      const serialized = JSON.stringify(dump, null, 2);
      navigator.clipboard.writeText(serialized);
      setJsonCopied(true);
      setTimeout(() => setJsonCopied(false), 2000);
      toast.success('Full save state copied to clipboard!', { icon: '📋' });
    } catch {
      toast.error('Failed to export state');
    }
  }, [tetrisEffect]);

  // Import save JSON
  const handleImportState = useCallback(() => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (parsed.rpg) localStorage.setItem('typenova_rpg_v2', JSON.stringify(parsed.rpg));
      if (parsed.stats) localStorage.setItem('typenova_stats', JSON.stringify(parsed.stats));
      if (parsed.history) localStorage.setItem('typenova_history', JSON.stringify(parsed.history));
      if (parsed.avatarId) localStorage.setItem('typenova_avatar_id', parsed.avatarId);
      if (parsed.bannerId) localStorage.setItem('typenova_banner_id', parsed.bannerId);
      if (typeof parsed.tetrisEffect === 'boolean') onSetTetrisEffect(parsed.tetrisEffect);

      window.dispatchEvent(new Event('cosmeticsChanged'));
      window.dispatchEvent(new Event('storage'));
      setShowImportBox(false);
      setImportJsonText('');
      toast.success('Save state restored successfully! Refreshing view...', { icon: '✨' });
    } catch (err: any) {
      toast.error(`Invalid JSON: ${err.message}`);
    }
  }, [importJsonText, onSetTetrisEffect]);

  // Procedural Artisan Randomizer
  const handleRandomizeArtisan = useCallback(() => {
    const config = generateRandomArtisan();
    saveArtisanConfig(config);
    toast.success(`Generated Artisan: "${config.name}"!`, { icon: '💎' });
  }, []);

  const TABS = useMemo(() => [
    { id: 'simulator' as GodModeTab, label: 'Simulator', icon: Bot },
    { id: 'combat' as GodModeTab, label: 'Combat Hexes', icon: Flame },
    { id: 'unlocks' as GodModeTab, label: 'Unlocks & Banners', icon: Unlock },
    { id: 'audio' as GodModeTab, label: 'Audio Lab', icon: Volume2 },
    { id: 'state' as GodModeTab, label: 'State Surgery', icon: Layers },
  ], []);

  return (
    <div
      className="fixed inset-0 z-[450] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-3xl max-h-[92vh] rounded-[2rem] border overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)]"
        style={{
          background: 'linear-gradient(180deg, #090b10 0%, #040508 100%)',
          borderColor: `rgba(${theme.glowPrimary}, 0.25)`,
          boxShadow: `0 0 50px rgba(${theme.glowPrimary}, 0.12), inset 0 1px 0 rgba(255,255,255,0.1)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-6 py-4 shrink-0 bg-white/[0.02]"
          style={{ borderColor: `rgba(${theme.glowPrimary}, 0.15)` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl border shadow-inner"
              style={{
                borderColor: `rgba(${theme.glowPrimary}, 0.4)`,
                background: `rgba(${theme.glowPrimary}, 0.12)`,
                color: `rgb(${theme.glowPrimary})`,
              }}
            >
              <Terminal size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black uppercase tracking-[0.24em] text-white">
                  God Mode Cockpit
                </span>
                <span
                  className="rounded-full border px-2 py-0.2 font-mono text-[8px] font-black uppercase tracking-[0.16em]"
                  style={{
                    borderColor: `rgba(${theme.glowPrimary}, 0.5)`,
                    background: `rgba(${theme.glowPrimary}, 0.18)`,
                    color: `rgb(${theme.glowPrimary})`,
                  }}
                >
                  ADMIN // QA SUITE
                </span>
              </div>
              <p className="font-mono text-[9px] text-white/40 tracking-wider">
                TypeNova v3.0.1 • Live Engine Diagnostics & Overrides
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRevertAll}
              title="Revert all God Mode unlocks and reset progress to Level 1 Novice"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <RotateCcw size={12} />
              <span>Revert All</span>
            </button>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 transition-all hover:rotate-90 hover:border-white/30 hover:text-white cursor-pointer"
              aria-label="Close God Mode"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex items-center gap-1 border-b border-white/[0.08] px-6 py-2 shrink-0 bg-black/40 overflow-x-auto">
          {TABS.map((t) => {
            const active = activeTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`relative flex items-center gap-2 rounded-xl px-3.5 py-1.5 font-mono text-[11px] font-black uppercase tracking-[0.14em] transition-all duration-200 cursor-pointer ${
                  active ? 'text-white' : 'text-white/45 hover:text-white/80 hover:bg-white/[0.03]'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="godmode-tab-glider"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: `rgba(${theme.glowPrimary}, 0.14)`,
                      border: `1px solid rgba(${theme.glowPrimary}, 0.45)`,
                      boxShadow: `0 0 16px rgba(${theme.glowPrimary}, 0.25)`,
                    }}
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <Icon size={13} style={active ? { color: `rgb(${theme.glowPrimary})` } : undefined} />
                <span className="relative z-10">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-white">
          {/* ═══════════ TAB 1: SIMULATOR ═══════════ */}
          {activeTab === 'simulator' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Bot Auto-Typist */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="p-2 rounded-xl border"
                      style={{
                        backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                        borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                        color: `rgb(${theme.glowPrimary})`,
                      }}
                    >
                      <Bot size={18} />
                    </div>
                    <div>
                      <h4 className="font-mono text-xs font-black uppercase tracking-[0.18em] text-white">
                        Auto-Typist Bot Simulator
                      </h4>
                      <p className="font-mono text-[10px] text-white/40">
                        Virtually drives the typing engine at calibrated speeds with keystroke simulation.
                      </p>
                    </div>
                  </div>

                  {isBotRunning && (
                    <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider text-emerald-400 animate-pulse">
                      <Activity size={10} /> Active Run
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-white/50 mb-1.5">
                      Target Speed: <span className="font-bold" style={{ color: `rgb(${theme.glowPrimary})` }}>{botWpm} WPM</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[60, 100, 150, 200, 300].map(speed => (
                        <button
                          key={speed}
                          onClick={() => setBotWpm(speed)}
                          style={
                            botWpm === speed
                              ? {
                                  backgroundColor: `rgb(${theme.glowPrimary})`,
                                  color: '#000',
                                  borderColor: `rgb(${theme.glowPrimary})`,
                                  boxShadow: `0 0 14px rgba(${theme.glowPrimary}, 0.45)`,
                                }
                              : undefined
                          }
                          className={`flex-1 py-1 rounded-lg font-mono text-[10px] font-black border transition-all cursor-pointer ${
                            botWpm === speed
                              ? 'border-transparent'
                              : 'bg-white/5 text-white/60 border-white/10 hover:border-white/25 hover:text-white'
                          }`}
                        >
                          {speed}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-white/50 mb-1.5">
                      Accuracy Profile: <span className="font-bold" style={{ color: `rgb(${theme.glowPrimary})` }}>{botAcc}%</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[100, 98, 95, 90].map(acc => (
                        <button
                          key={acc}
                          onClick={() => setBotAcc(acc)}
                          style={
                            botAcc === acc
                              ? {
                                  backgroundColor: `rgb(${theme.glowPrimary})`,
                                  color: '#000',
                                  borderColor: `rgb(${theme.glowPrimary})`,
                                  boxShadow: `0 0 14px rgba(${theme.glowPrimary}, 0.45)`,
                                }
                              : undefined
                          }
                          className={`flex-1 py-1 rounded-lg font-mono text-[10px] font-black border transition-all cursor-pointer ${
                            botAcc === acc
                              ? 'border-transparent'
                              : 'bg-white/5 text-white/60 border-white/10 hover:border-white/25 hover:text-white'
                          }`}
                        >
                          {acc}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onToggleBot?.(botWpm, botAcc);
                    if (!isBotRunning) onClose();
                  }}
                  style={
                    !isBotRunning
                      ? {
                          backgroundColor: `rgb(${theme.glowPrimary})`,
                          color: '#000',
                          borderColor: `rgb(${theme.glowPrimary})`,
                          boxShadow: `0 0 20px rgba(${theme.glowPrimary}, 0.45)`,
                        }
                      : undefined
                  }
                  className={`w-full py-3 rounded-xl font-mono text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isBotRunning
                      ? 'bg-red-500 text-white border border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:bg-red-600'
                      : 'border'
                  }`}
                >
                  {isBotRunning ? <Square size={14} /> : <Play size={14} />}
                  {isBotRunning ? 'Halt Auto-Typist Bot' : `Launch Bot at ${botWpm} WPM (${botAcc}% Acc)`}
                </button>
              </div>

              {/* Instant Run Finisher */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="p-2 rounded-xl border"
                    style={{
                      backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                      borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                      color: `rgb(${theme.glowPrimary})`,
                    }}
                  >
                    <FastForward size={18} />
                  </div>
                  <div>
                    <h4 className="font-mono text-xs font-black uppercase tracking-[0.18em] text-white">
                      Instant Run Finisher
                    </h4>
                    <p className="font-mono text-[10px] text-white/40">
                      Injects a completed run directly into the engine, immediately triggering Results & XP breakdown.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-white/50 mb-1">
                      Inject WPM: <span className="font-bold" style={{ color: `rgb(${theme.glowPrimary})` }}>{finishWpm} WPM</span>
                    </label>
                    <input
                      type="range"
                      min={20}
                      max={250}
                      step={5}
                      value={finishWpm}
                      onChange={e => setFinishWpm(Number(e.target.value))}
                      style={{ accentColor: `rgb(${theme.glowPrimary})` }}
                      className="w-full cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-white/50 mb-1">
                      Inject Accuracy: <span className="font-bold" style={{ color: `rgb(${theme.glowPrimary})` }}>{finishAcc}%</span>
                    </label>
                    <input
                      type="range"
                      min={80}
                      max={100}
                      step={1}
                      value={finishAcc}
                      onChange={e => setFinishAcc(Number(e.target.value))}
                      style={{ accentColor: `rgb(${theme.glowPrimary})` }}
                      className="w-full cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    onInstantFinish?.(finishWpm, finishAcc);
                    onClose();
                  }}
                  style={{
                    backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                    borderColor: `rgba(${theme.glowPrimary}, 0.4)`,
                    color: `rgb(${theme.glowPrimary})`,
                    boxShadow: `0 0 20px rgba(${theme.glowPrimary}, 0.15)`,
                  }}
                  className="w-full py-2.5 rounded-xl font-mono text-[11px] font-black uppercase tracking-[0.18em] transition-all flex items-center justify-center gap-2 cursor-pointer border"
                >
                  <FastForward size={14} /> Inject & Trigger Results ({finishWpm} WPM · {finishAcc}%)
                </button>
              </div>

              {/* Combo Stacker */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="p-2 rounded-xl border"
                    style={{
                      backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                      borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                      color: `rgb(${theme.glowPrimary})`,
                    }}
                  >
                    <Zap size={18} />
                  </div>
                  <div>
                    <h4 className="font-mono text-xs font-black uppercase tracking-[0.18em] text-white">
                      Instant Combo Stacker
                    </h4>
                    <p className="font-mono text-[10px] text-white/40">
                      Instantly elevates active combo to test audio escalation, Tetris particles, and Hellfire state.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[25, 50, 100, 200, 500].map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        typing?.setCombo?.(c);
                        toast.success(`Combo stacked to ${c}x!`, { icon: '⚡' });
                      }}
                      style={{
                        backgroundColor: `rgba(${theme.glowPrimary}, 0.1)`,
                        borderColor: `rgba(${theme.glowPrimary}, 0.3)`,
                        color: `rgb(${theme.glowPrimary})`,
                      }}
                      className="py-2 rounded-xl font-mono text-[10px] font-black uppercase tracking-wider hover:brightness-125 transition-all cursor-pointer border"
                    >
                      {c}x Combo
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ TAB 2: COMBAT HEXES ═══════════ */}
          {activeTab === 'combat' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      <Flame size={18} />
                    </div>
                    <div>
                      <h4 className="font-mono text-xs font-black uppercase tracking-[0.18em] text-white">
                        Self-Inflicted Sabotage Sandbox
                      </h4>
                      <p className="font-mono text-[10px] text-white/40">
                        Trigger any 1v1 tactical hex on yourself to test distortion shaders, blur filters & shields.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onClearTestHexes?.();
                      toast.success('All active hexes purged', { icon: '🛡️' });
                    }}
                    className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 font-mono text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white cursor-pointer"
                  >
                    Purge All
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(HEX_ABILITIES) as HexType[]).map((hexKey) => {
                    const hex = HEX_ABILITIES[hexKey];
                    const isDefense = hex.category === 'defense';
                    return (
                      <button
                        key={hexKey}
                        onClick={() => {
                          onTriggerTestHex?.(hexKey);
                          toast.success(`Cast ${hex.name}! (${hex.durationMs / 1000}s)`, { icon: isDefense ? '🛡️' : '⚡' });
                        }}
                        className="group flex flex-col gap-1 p-4 rounded-2xl border text-left transition-all hover:scale-[1.01] cursor-pointer"
                        style={{
                          background: `rgba(${hex.accentColor}, 0.08)`,
                          borderColor: `rgba(${hex.accentColor}, 0.35)`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="font-mono text-xs font-black uppercase tracking-wider"
                            style={{ color: `rgb(${hex.accentColor})` }}
                          >
                            {hex.name}
                          </span>
                          <span
                            className="rounded px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase"
                            style={{
                              background: `rgba(${hex.accentColor}, 0.2)`,
                              color: `rgb(${hex.accentColor})`,
                            }}
                          >
                            {hex.durationMs / 1000}s
                          </span>
                        </div>
                        <p className="font-mono text-[10px] text-white/50 line-clamp-2">
                          {hex.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hex Energy Control */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h4 className="font-mono text-xs font-black uppercase tracking-[0.18em] text-white">
                      Hex Energy Capacitor Overdrive
                    </h4>
                    <p className="font-mono text-[10px] text-white/40">
                      Instantly charge combat battery to test ability availability without racing.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {[0, 35, 50, 65, 100].map(e => (
                    <button
                      key={e}
                      onClick={() => {
                        onSetTestHexEnergy?.(e);
                        toast.success(`Hex Energy set to ${e}%`, { icon: '⚡' });
                      }}
                      className="flex-1 py-2 rounded-xl font-mono text-[10px] font-black uppercase tracking-wider border border-white/10 bg-white/5 hover:border-amber-400/50 hover:bg-amber-400/10 text-white/70 hover:text-white transition-all cursor-pointer"
                    >
                      {e}% Energy
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ TAB 3: UNLOCKS & BANNERS ═══════════ */}
          {activeTab === 'unlocks' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* MASTER UNLOCK BANNER */}
              <div
                className="relative overflow-hidden rounded-2xl border p-6 space-y-4"
                style={{
                  background: `linear-gradient(135deg, rgba(${theme.glowPrimary}, 0.16) 0%, rgba(217, 70, 239, 0.12) 100%)`,
                  borderColor: `rgba(${theme.glowPrimary}, 0.45)`,
                  boxShadow: `0 0 35px rgba(${theme.glowPrimary}, 0.18)`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-2xl font-black"
                      style={{
                        backgroundColor: `rgb(${theme.glowPrimary})`,
                        color: '#000',
                        boxShadow: `0 0 20px rgba(${theme.glowPrimary}, 0.5)`,
                      }}
                    >
                      <Unlock size={22} />
                    </div>
                    <div>
                      <h3 className="font-mono text-sm font-black uppercase tracking-[0.2em] text-white">
                        Master Unlock (100% Everything)
                      </h3>
                      <p className="font-mono text-[11px] text-white/70">
                        Unlocks ALL 5 Milestone Banners, 24 Operator Titles, 20 Hall of Legends Badges & Level 50+
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[9px] uppercase tracking-wider text-white/70">
                  <div className="rounded-lg bg-black/40 p-2 border border-white/10 text-center">
                    <span className="block font-bold" style={{ color: `rgb(${theme.glowPrimary})` }}>5 / 5</span> Milestone Banners
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-white/10 text-center">
                    <span className="block font-bold" style={{ color: `rgb(${theme.glowPrimary})` }}>24 / 24</span> Operator Titles
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-white/10 text-center">
                    <span className="block font-bold" style={{ color: `rgb(${theme.glowPrimary})` }}>20 / 20</span> Badges
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-white/10 text-center">
                    <span className="block font-bold" style={{ color: `rgb(${theme.glowPrimary})` }}>LVL 50+</span> Max Apex Rank
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    onClick={handleMasterUnlock}
                    style={{
                      background: `linear-gradient(to right, rgb(${theme.glowPrimary}), #f59e0b)`,
                      boxShadow: `0 0 25px rgba(${theme.glowPrimary}, 0.45)`,
                    }}
                    className="flex-1 w-full py-3.5 text-black font-mono text-xs font-black uppercase tracking-[0.24em] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99]"
                  >
                    <Unlock size={15} /> Execute 100% Master Unlock
                  </button>

                  <button
                    onClick={handleRevertAll}
                    className="w-full sm:w-auto px-5 py-3.5 border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-mono text-xs font-black uppercase tracking-[0.2em] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:border-red-500/60 active:scale-[0.99]"
                  >
                    <RotateCcw size={14} /> Revert All
                  </button>
                </div>

                {hasBackup && (
                  <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <History size={14} className="text-amber-400 shrink-0" />
                      <span className="font-mono text-[10px] text-amber-300">
                        Pre-unlock progress snapshot detected.
                      </span>
                    </div>
                    <button
                      onClick={handleRestoreBackup}
                      className="px-3 py-1 rounded-lg border border-amber-500/50 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-mono text-[9px] font-black uppercase tracking-wider cursor-pointer"
                    >
                      Restore Pre-Unlock State
                    </button>
                  </div>
                )}
              </div>

              {/* Granular Progression Controls */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                <h4 className="font-mono text-xs font-black uppercase tracking-[0.18em] text-white flex items-center gap-2">
                  <Sliders size={14} style={{ color: `rgb(${theme.glowPrimary})` }} /> Granular Unlock Overrides
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleUnlockBannersOnly}
                    style={{
                      borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                      backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                      color: `rgb(${theme.glowPrimary})`,
                    }}
                    className="p-4 rounded-xl border font-mono text-[11px] font-black uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 text-center cursor-pointer hover:brightness-125"
                  >
                    <Layers size={18} /> Unlock All 5 Banners Only
                    <span className="text-[8px] opacity-60 font-normal">Sets 150+ WPM & 200x Combo</span>
                  </button>

                  <button
                    onClick={() => {
                      rpg.unlockAllAchievements();
                      toast.success('All 20 Achievements Unlocked!', { icon: '🏆' });
                    }}
                    style={{
                      borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                      backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                      color: `rgb(${theme.glowPrimary})`,
                    }}
                    className="p-4 rounded-xl border font-mono text-[11px] font-black uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 text-center cursor-pointer hover:brightness-125"
                  >
                    <Trophy size={18} /> Unlock 20 Badges Only
                    <span className="text-[8px] opacity-60 font-normal">Hall of Legends Completion</span>
                  </button>
                </div>

                {/* Custom Level Slider */}
                <div className="pt-2">
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-white/60 mb-2">
                    <span>Set Custom Level:</span>
                    <span className="font-bold text-xs" style={{ color: `rgb(${theme.glowPrimary})` }}>Level {customLevel} ({customLevel * 5000} XP)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={50}
                      value={customLevel}
                      onChange={e => setCustomLevel(Number(e.target.value))}
                      style={{ accentColor: `rgb(${theme.glowPrimary})` }}
                      className="flex-1 cursor-pointer"
                    />
                    <button
                      onClick={() => {
                        const targetXp = Math.max(0, Math.pow(customLevel - 1, 2) * 100);
                        rpg.setXp(targetXp);
                        localStorage.setItem('typezen_xp', targetXp.toString());
                        const rpgRaw = localStorage.getItem('typenova_rpg_v2');
                        const rpgData = rpgRaw ? JSON.parse(rpgRaw) : {};
                        rpgData.xp = targetXp;
                        localStorage.setItem('typenova_rpg_v2', JSON.stringify(rpgData));
                        window.dispatchEvent(new Event('storage'));
                        toast.success(`Set to Level ${customLevel}! (${targetXp.toLocaleString()} XP)`, { icon: '⭐' });
                      }}
                      style={{
                        backgroundColor: `rgb(${theme.glowPrimary})`,
                        color: '#000',
                      }}
                      className="px-4 py-1.5 rounded-lg font-mono text-[10px] font-black uppercase tracking-wider cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Procedural Artisan Randomizer */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <span className="block font-mono text-xs font-bold text-white">Procedural Artisan Keycap</span>
                    <span className="font-mono text-[10px] text-white/40">Generates a completely randomized 3D artisan config</span>
                  </div>
                  <button
                    onClick={handleRandomizeArtisan}
                    style={{
                      borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                      backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                      color: `rgb(${theme.glowPrimary})`,
                    }}
                    className="px-4 py-2 rounded-xl border font-mono text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer hover:brightness-125"
                  >
                    <Sparkles size={13} /> Randomize Keycap
                  </button>
                </div>
              </div>

              {/* Re-lock / Revert */}
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="block font-mono text-xs font-bold text-red-300">Factory Revert & Reset</span>
                  <span className="font-mono text-[10px] text-red-200/50">Wipe all unlocks, XP, levels, and badges back to Level 1 Novice</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {hasBackup && (
                    <button
                      onClick={handleRestoreBackup}
                      className="px-3 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <History size={12} /> Restore Pre-Unlock
                    </button>
                  )}
                  <button
                    onClick={handleRevertAll}
                    className="px-4 py-2 rounded-xl border border-red-500/40 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-mono text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={12} /> Revert All
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ TAB 4: AUDIO LAB ═══════════ */}
          {activeTab === 'audio' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="p-2 rounded-xl border"
                      style={{
                        backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                        borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                        color: `rgb(${theme.glowPrimary})`,
                      }}
                    >
                      <Volume2 size={18} />
                    </div>
                    <div>
                      <h4 className="font-mono text-xs font-black uppercase tracking-[0.18em] text-white">
                        Switch Profile Soundboard
                      </h4>
                      <p className="font-mono text-[10px] text-white/40">
                        Audit mechanical key-click sound synthesis across all 7 supported acoustic profiles.
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] font-bold" style={{ color: `rgb(${theme.glowPrimary})` }}>Current: {soundProfile.toUpperCase()}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SOUND_PROFILES.map((prof) => {
                    const isSelected = soundProfile === prof.key;
                    return (
                      <div
                        key={prof.key}
                        style={
                          isSelected
                            ? {
                                backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                                borderColor: `rgba(${theme.glowPrimary}, 0.45)`,
                                boxShadow: `0 0 15px rgba(${theme.glowPrimary}, 0.2)`,
                              }
                            : undefined
                        }
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isSelected
                            ? ''
                            : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span className={`block font-mono text-xs font-bold ${isSelected ? 'text-white' : 'text-white/80'}`}>
                            {prof.name}
                          </span>
                          <span className="block font-mono text-[9px] text-white/40 truncate">
                            {prof.desc}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              onPlayPreviewSound?.(prof.key);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-[9px] font-black uppercase tracking-wider cursor-pointer"
                            title="Play sample burst"
                          >
                            ▶ Audition
                          </button>
                          <button
                            onClick={() => {
                              onSelectSoundProfile(prof.key);
                              toast.success(`Equipped ${prof.name} sound profile!`);
                            }}
                            style={
                              isSelected
                                ? {
                                    backgroundColor: `rgb(${theme.glowPrimary})`,
                                    color: '#000',
                                  }
                                : undefined
                            }
                            className={`px-2.5 py-1 rounded-lg font-mono text-[9px] font-black uppercase tracking-wider cursor-pointer ${
                              isSelected ? '' : 'bg-white/5 text-white/50 hover:text-white'
                            }`}
                          >
                            {isSelected ? 'Equipped' : 'Equip'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Combo Pitch Ladder */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="p-2 rounded-xl border"
                    style={{
                      backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                      borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                      color: `rgb(${theme.glowPrimary})`,
                    }}
                  >
                    <Activity size={18} />
                  </div>
                  <div>
                    <h4 className="font-mono text-xs font-black uppercase tracking-[0.18em] text-white">
                      12-Semitone Combo Frequency Ladder
                    </h4>
                    <p className="font-mono text-[10px] text-white/40">
                      Tests exponential audio pitch multiplier (semitone step) from combo 1 to combo 100.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {[1, 5, 10, 25, 50, 75, 100].map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        onPlayPreviewSound?.();
                        typing?.setCombo?.(c);
                      }}
                      style={{
                        borderColor: `rgba(${theme.glowPrimary}, 0.3)`,
                        backgroundColor: `rgba(${theme.glowPrimary}, 0.1)`,
                        color: `rgb(${theme.glowPrimary})`,
                      }}
                      className="flex-1 py-1.5 rounded-lg border font-mono text-[9px] font-bold cursor-pointer text-center hover:brightness-125"
                    >
                      {c}x Pitch
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ TAB 5: STATE SURGERY ═══════════ */}
          {activeTab === 'state' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Full Factory Revert */}
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-mono text-xs font-black uppercase tracking-[0.18em] text-red-300 flex items-center gap-2">
                      <AlertTriangle size={14} className="text-red-400" /> Full Revert & Factory Reset
                    </h4>
                    <p className="font-mono text-[10px] text-red-200/60 mt-1">
                      Wipes all simulated God Mode unlocks, resets progression to Level 1 Novice, clears patron entitlements, and restores default cosmetic loadouts.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {hasBackup && (
                      <button
                        onClick={handleRestoreBackup}
                        className="px-3 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <History size={12} /> Restore Pre-Unlock
                      </button>
                    )}
                    <button
                      onClick={handleRevertAll}
                      className="px-4 py-2 rounded-xl border border-red-500/40 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-mono text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw size={13} /> Revert All
                    </button>
                  </div>
                </div>

                {hasBackup && (
                  <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 mt-2">
                    <div className="flex items-center gap-2">
                      <History size={14} className="text-amber-400 shrink-0" />
                      <span className="font-mono text-[10px] text-amber-300">
                        Pre-unlock progress snapshot detected in local storage.
                      </span>
                    </div>
                    <button
                      onClick={handleRestoreBackup}
                      className="px-3 py-1 rounded-lg border border-amber-500/50 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-mono text-[9px] font-black uppercase tracking-wider cursor-pointer"
                    >
                      Restore Pre-Unlock State
                    </button>
                  </div>
                )}
              </div>

              {/* Granular Resets */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
                <h4 className="font-mono text-xs font-black uppercase tracking-[0.18em] text-white flex items-center gap-2">
                  <RotateCcw size={14} style={{ color: `rgb(${theme.glowPrimary})` }} /> Surgical Data Resets
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleResetHistoryOnly}
                    className="p-3.5 rounded-xl border border-white/10 bg-white/5 hover:border-white/30 text-left cursor-pointer transition-all"
                  >
                    <span className="block font-mono text-xs font-bold text-white">Reset Run History Only</span>
                    <span className="block font-mono text-[9px] text-white/40 mt-0.5">Wipes chart runs; retains Level & Badges</span>
                  </button>

                  <button
                    onClick={() => {
                      try {
                        const rpgRaw = localStorage.getItem('typenova_rpg_v2');
                        if (rpgRaw) {
                          const parsed = JSON.parse(rpgRaw);
                          parsed.heatmap = {};
                          localStorage.setItem('typenova_rpg_v2', JSON.stringify(parsed));
                        }
                        toast.success('Weak keys & heatmap reset', { icon: '🧹' });
                      } catch {}
                    }}
                    className="p-3.5 rounded-xl border border-white/10 bg-white/5 hover:border-white/30 text-left cursor-pointer transition-all"
                  >
                    <span className="block font-mono text-xs font-bold text-white">Reset Weak Keys Heatmap</span>
                    <span className="block font-mono text-[9px] text-white/40 mt-0.5">Clears error frequencies for all keys</span>
                  </button>
                </div>
              </div>

              {/* JSON Save State Backup / Restore */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-mono text-xs font-black uppercase tracking-[0.18em] text-white">
                      Save State JSON Backup & Restore
                    </h4>
                    <p className="font-mono text-[10px] text-white/40">
                      Export full player snapshot to clipboard or paste back to reproduce bugs.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportState}
                      style={{
                        borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                        backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                        color: `rgb(${theme.glowPrimary})`,
                      }}
                      className="px-3 py-1.5 rounded-xl border font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:brightness-125"
                    >
                      {jsonCopied ? <Check size={12} /> : <Copy size={12} />}
                      {jsonCopied ? 'Copied!' : 'Export JSON'}
                    </button>

                    <button
                      onClick={() => setShowImportBox(!showImportBox)}
                      className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/70 font-mono text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                    >
                      {showImportBox ? 'Cancel' : 'Import JSON'}
                    </button>
                  </div>
                </div>

                {showImportBox && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <textarea
                      value={importJsonText}
                      onChange={e => setImportJsonText(e.target.value)}
                      placeholder="Paste exported save state JSON here..."
                      style={{ color: `rgb(${theme.glowPrimary})` }}
                      className="w-full h-28 bg-black/60 border border-white/15 rounded-xl p-3 font-mono text-[10px] outline-none focus:border-white/40"
                    />
                    <button
                      onClick={handleImportState}
                      disabled={!importJsonText.trim()}
                      style={{
                        backgroundColor: `rgb(${theme.glowPrimary})`,
                        color: '#000',
                      }}
                      className="w-full py-2 disabled:opacity-30 font-mono text-[10px] font-black uppercase tracking-widest rounded-lg cursor-pointer"
                    >
                      Restore Injected State
                    </button>
                  </div>
                )}
              </div>

              {/* Admin Bug Reports Hub */}
              <div
                className="rounded-2xl border p-5 flex items-center justify-between"
                style={{
                  borderColor: `rgba(${theme.glowPrimary}, 0.3)`,
                  backgroundColor: `rgba(${theme.glowPrimary}, 0.08)`,
                }}
              >
                <div>
                  <span className="block font-mono text-xs font-black uppercase tracking-wider text-white">
                    Admin Bug Reports Inbox
                  </span>
                  <span className="font-mono text-[10px] text-white/60">
                    Inspect user-submitted bugs, telemetry logs, and system error payloads
                  </span>
                </div>
                <button
                  onClick={() => {
                    onOpenModal('bugReports');
                  }}
                  style={{
                    backgroundColor: `rgb(${theme.glowPrimary})`,
                    color: '#000',
                    boxShadow: `0 0 15px rgba(${theme.glowPrimary}, 0.35)`,
                  }}
                  className="px-4 py-2 font-mono text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer hover:brightness-110"
                >
                  Open Inbox
                </button>
              </div>

              {/* Tetris Effect Toggle */}
              <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                <div>
                  <h5 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                    Tetris Effect Particle Cascade
                  </h5>
                  <p className="font-mono text-[10px] text-white/40">Combo 50+ celebratory block cascade physics</p>
                </div>
                <button
                  onClick={() => onSetTetrisEffect(!tetrisEffect)}
                  className={`px-4 py-1.5 rounded-xl font-mono text-[10px] font-black uppercase tracking-widest cursor-pointer ${
                    tetrisEffect
                      ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {tetrisEffect ? 'ON ✓' : 'OFF'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info strip */}
        <div className="flex items-center justify-between border-t border-white/[0.08] px-6 py-3 shrink-0 bg-black/60 font-mono text-[9px] text-white/35">
          <span>Shortcuts: Press <kbd className="text-white/60 bg-white/10 px-1 py-0.5 rounded">Esc</kbd> to close</span>
          <span>Universal Hotkey: <kbd className="bg-white/10 px-1 py-0.5 rounded font-bold" style={{ color: `rgb(${theme.glowPrimary})` }}>Ctrl+Shift+Alt+G</kbd></span>
        </div>
      </div>
    </div>
  );
});
