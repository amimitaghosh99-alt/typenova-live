import React, { useState, useEffect, useRef } from 'react';
import { X, Award, Zap, Target, ShieldCheck, ChevronDown, Check, Loader2, User } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Theme } from '@/data/constants';
import { TITLE_BADGES, getActiveTitleId, setActiveTitleId, type UserSkillStats } from '@/data/titles';

interface PublicProfileData {
  username: string;
  level: number;
  xp: number;
  equipped_title: string;
  unlocked_badges: string[];
  max_wpm: number;
  avg_acc: number;
  tests_completed: number;
}

interface PlayerProfileModalProps {
  targetUsername: string | null;
  onClose: () => void;
  supabase: SupabaseClient | null;
  localUsername: string | null;
  theme: Theme;
  localRPGStats?: {
    level: number;
    xp: number;
    currentLevelProgress: number;
    xpNeeded: number;
    skillStats: UserSkillStats;
  };
}

export const PlayerProfileModal = React.memo(function PlayerProfileModal({
  targetUsername,
  onClose,
  supabase,
  localUsername,
  theme,
  localRPGStats,
}: PlayerProfileModalProps) {
  const [profileData, setProfileData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showBadgeSelector, setShowBadgeSelector] = useState(false);
  const [equippedTitleId, setEquippedTitleId] = useState<string>('novice');
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOwnProfile = !!(
    targetUsername &&
    localUsername &&
    targetUsername.toLowerCase() === localUsername.toLowerCase()
  );

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!targetUsername) return;

    // C6: If it's our own profile and localRPGStats are available, use them
    // directly and skip the Supabase fetch to prevent stale cloud data from
    // overwriting fresh local stats.
    if (isOwnProfile && localRPGStats) {
      const activeId = getActiveTitleId();
      setEquippedTitleId(activeId);
      setProfileData({
        username: targetUsername,
        level: localRPGStats.level,
        xp: localRPGStats.xp,
        equipped_title: activeId,
        unlocked_badges: TITLE_BADGES.filter((b) => b.isUnlocked(localRPGStats.skillStats)).map((b) => b.id),
        max_wpm: localRPGStats.skillStats.maxWpm,
        avg_acc: localRPGStats.skillStats.avgAccuracy,
        tests_completed: localRPGStats.skillStats.testsCompleted,
      });
      setLoading(false);
      setNotFound(false);
      return; // own profile uses local truth — no cloud fetch needed
    }

    // For other players, fetch from Supabase public_profiles
    let active = true;
    (async () => {
      if (!supabase) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setNotFound(false);

      try {
        const { data, error } = await supabase
          .from('public_profiles')
          .select('*')
          .ilike('username', targetUsername)
          .maybeSingle();

        if (!active) return;

        if (error || !data) {
          setNotFound(true);
        } else {
          const row = data as PublicProfileData;
          setProfileData(row);
          setEquippedTitleId(row.equipped_title || 'novice');
        }
      } catch (err) {
        console.error('Error fetching public profile:', err);
        setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [targetUsername, isOwnProfile, localRPGStats, supabase]);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(onClose, 180);
  };

  const handleSelectTitle = async (titleId: string) => {
    if (!isOwnProfile) return;

    setActiveTitleId(titleId);
    setEquippedTitleId(titleId);
    setShowBadgeSelector(false);

    if (profileData) {
      setProfileData({ ...profileData, equipped_title: titleId });
    }
    
    // L3: Dispatch event so App.tsx auto-sync effect triggers and updates public_profiles 
    // with the latest equipped title immediately across sessions.
    window.dispatchEvent(new Event('titleChanged'));

    // Upsert updated title to Supabase public_profiles table
    if (supabase && localUsername) {
      try {
        // H9: Use update() instead of upsert() to avoid wiping existing RPG stats 
        // with NULLs when the unique constraint fails or row exists.
        await supabase.from('public_profiles')
          .update({
            equipped_title: titleId,
            updated_at: new Date().toISOString(),
          })
          .eq('username', localUsername);
      } catch (e) {
        console.error('Failed to update equipped title on cloud:', e);
      }
    }
  };

  if (!targetUsername) return null;

  const activeBadge =
    TITLE_BADGES.find((b) => b.id === equippedTitleId) || TITLE_BADGES[0];

  // Calculate level progress
  const displayLevel = profileData?.level ?? (isOwnProfile ? localRPGStats?.level : undefined) ?? 1;
  const displayXp = profileData?.xp ?? (isOwnProfile ? localRPGStats?.xp : undefined) ?? 0;
  const nextLevelXp = Math.pow(displayLevel, 2) * 100;
  const prevLevelXp = Math.pow(displayLevel - 1, 2) * 100;
  const levelProgressPct = Math.min(
    100,
    Math.max(0, ((displayXp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100)
  );

  const skillStats: UserSkillStats = {
    maxWpm: profileData?.max_wpm ?? localRPGStats?.skillStats.maxWpm ?? 0,
    avgAccuracy: profileData?.avg_acc ?? localRPGStats?.skillStats.avgAccuracy ?? 0,
    testsCompleted: profileData?.tests_completed ?? localRPGStats?.skillStats.testsCompleted ?? 0,
    dailyStreak: localRPGStats?.skillStats.dailyStreak ?? 0,
    racesWon: 0,
    totalWordsTyped: localRPGStats?.skillStats.totalWordsTyped ?? 0,
  };

  const unlockedBadgeIds = new Set(
    profileData?.unlocked_badges ||
      (localRPGStats
        ? TITLE_BADGES.filter((b) => b.isUnlocked(localRPGStats.skillStats)).map((b) => b.id)
        : ['novice'])
  );

  return (
    <div
      className={`fixed inset-0 z-[600] flex items-center justify-center bg-black/80 p-4 overflow-y-auto transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      <div
        className={`glass-panel relative w-full max-w-md my-auto flex flex-col rounded-2xl border border-white/15 bg-slate-950/80 shadow-2xl shadow-cyan-950/30 overflow-hidden p-5 sm:p-6 font-mono ${
          isClosing ? 'lucid-scale-exit' : 'lucid-scale'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Glow Backdrop */}
        <div
          className="absolute -top-32 -left-32 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: `rgb(${theme.glowPrimary || '6, 182, 212'})` }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-15"
          style={{ background: `rgb(${theme.glowSecondary || '34, 211, 238'})` }}
        />

        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10 shrink-0 relative z-10">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              <User size={15} />
            </div>
            {isOwnProfile ? 'Your Player Profile' : `${targetUsername}'s Profile`}
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white rounded-full transition-all hover:rotate-90"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Content */}
        {loading && !profileData ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500 font-mono gap-3">
            <Loader2 size={28} className="animate-spin text-cyan-400" />
            <span className="text-xs font-bold tracking-wider">LOADING PROFILE…</span>
          </div>
        ) : notFound ? (
          <div className="flex flex-col items-center justify-center py-10 text-zinc-500 font-mono gap-2 text-center">
            <User size={36} className="text-zinc-600 opacity-40 mb-1" />
            <span className="text-sm font-bold text-zinc-300">PLAYER NOT FOUND</span>
            <p className="text-xs text-zinc-500">"{targetUsername}" hasn't registered a public profile yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 relative z-10">
            {/* Header Profile Info */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-2 border-cyan-400/50 flex items-center justify-center text-cyan-300 font-black text-lg uppercase shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                    {targetUsername.substring(0, 1)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-cyan-400 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full border-2 border-slate-950 shadow-md">
                    LVL {displayLevel}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-white tracking-tight">{targetUsername}</h3>
                    {isOwnProfile && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        YOU
                      </span>
                    )}
                  </div>

                  {/* Active Title Badge */}
                  {isOwnProfile ? (
                    <button
                      onClick={() => setShowBadgeSelector(!showBadgeSelector)}
                      className={`mt-1 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border transition-all hover:scale-105 ${activeBadge.color}`}
                      title="Click to change title"
                    >
                      <span>{activeBadge.icon}</span>
                      <span>{activeBadge.name}</span>
                      <ChevronDown size={12} className="opacity-60" />
                    </button>
                  ) : (
                    <div
                      className={`mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border ${activeBadge.color}`}
                    >
                      <span>{activeBadge.icon}</span>
                      <span>{activeBadge.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Level XP Bar */}
              <div className="w-full sm:w-48 bg-slate-900/60 border border-white/10 p-2.5 rounded-xl">
                <div className="flex justify-between items-center text-xs font-mono mb-1">
                  <span className="font-bold text-zinc-300">Level {displayLevel}</span>
                  <span className="text-cyan-300 font-extrabold">{displayXp} XP</span>
                </div>
                <div className="relative h-2 w-full bg-slate-950/80 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                    style={{ width: `${levelProgressPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="bg-slate-900/40 border border-white/5 p-3 rounded-xl flex items-center gap-2.5">
                <Zap size={15} className="text-amber-400 shrink-0" />
                <div>
                  <div className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Max Speed</div>
                  <div className="text-xs font-black text-white mt-0.5">{skillStats.maxWpm} WPM</div>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-white/5 p-3 rounded-xl flex items-center gap-2.5">
                <Target size={15} className="text-emerald-400 shrink-0" />
                <div>
                  <div className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Avg Accuracy</div>
                  <div className="text-xs font-black text-white mt-0.5">{skillStats.avgAccuracy}%</div>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-white/5 p-3 rounded-xl flex items-center gap-2.5 col-span-2 sm:col-span-1">
                <ShieldCheck size={15} className="text-cyan-400 shrink-0" />
                <div>
                  <div className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Tests</div>
                  <div className="text-xs font-black text-white mt-0.5">{skillStats.testsCompleted} Done</div>
                </div>
              </div>
            </div>

            {/* Title Badge Selection Dropdown (Only for local player) */}
            {isOwnProfile && showBadgeSelector && (
              <div className="mt-2 pt-3 border-t border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Award size={14} className="text-cyan-400" /> Equip Title Badge
                  </span>
                  <span className="text-[10px] font-bold text-cyan-300">
                    {unlockedBadgeIds.size} Unlocked
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {TITLE_BADGES.map((badge) => {
                    const unlocked = isOwnProfile
                      ? badge.isUnlocked(skillStats)
                      : unlockedBadgeIds.has(badge.id);
                    const isSelected = badge.id === equippedTitleId;

                    return (
                      <button
                        key={badge.id}
                        disabled={!unlocked}
                        onClick={() => unlocked && handleSelectTitle(badge.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-white shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                            : unlocked
                            ? 'bg-slate-900/40 border-white/10 hover:border-white/20 text-zinc-200'
                            : 'bg-slate-950/60 border-white/8 text-zinc-400 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`text-base shrink-0 ${unlocked ? '' : 'grayscale opacity-50'}`}>
                            {badge.icon}
                          </span>
                          <div className="min-w-0">
                            <div className={`text-xs font-bold truncate ${unlocked ? 'text-white' : 'text-zinc-300'}`}>
                              {badge.name}
                            </div>
                            <div className={`text-[9px] truncate ${unlocked ? 'text-zinc-400' : 'text-zinc-400/90'}`}>
                              {badge.description}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check size={14} className="text-cyan-400 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
