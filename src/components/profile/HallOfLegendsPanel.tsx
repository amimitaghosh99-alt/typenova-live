// ═══════════════════════════════════════════════════════════════════════
//  HALL OF LEGENDS PANEL — Trophy & Achievement Showcase
//  ---------------------------------------------------------------------
//  Integrated directly into the Operator Dossier profile page.
//  Displays all 20 achievements across SKILL, HARDCORE, GRIND, and SUPER
//  categories with live unlock states, prestige progression, category filters,
//  and dynamic theme color binding.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import {
    Check, Flame, Lock, Search, Shield, Skull, Sparkles, Trophy, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ACHIEVEMENTS } from '@/data/constants';
import { achievementIcon } from '@/lib/achievementIcons';
import { rgba } from '@/components/profile/profileMotion';

export interface HallOfLegendsPanelProps {
    unlockedIds: Set<string>;
    accent: string;
    isOwnProfile?: boolean;
}

type CategoryFilter = 'ALL' | 'SKILL' | 'HARDCORE' | 'GRIND' | 'SUPER';
type StatusFilter = 'all' | 'unlocked' | 'locked';

interface PrestigeTier {
    title: string;
    tierName: string;
    minBadges: number;
    icon: LucideIcon;
    description: string;
}

const PRESTIGE_TIERS: PrestigeTier[] = [
    { title: 'Novice Contender', tierName: 'Tier I', minBadges: 0, icon: Shield, description: 'Beginning the journey across the terminal.' },
    { title: 'Adept Typist', tierName: 'Tier II', minBadges: 5, icon: Zap, description: 'Demonstrating consistent pace and technical command.' },
    { title: 'Master Tactician', tierName: 'Tier III', minBadges: 10, icon: Flame, description: 'Seasoned in hardcore conditions and high-speed runs.' },
    { title: 'Apex Legend', tierName: 'Tier IV', minBadges: 15, icon: Trophy, description: 'An elite keyboard artisan nearing perfection.' },
    { title: 'TYPE NOVA Immortal', tierName: 'Apex', minBadges: 20, icon: Sparkles, description: 'Absolute mastery of all terminal disciplines.' },
];

export function getPrestigeRank(unlockedCount: number) {
    let currentTier = PRESTIGE_TIERS[0];
    let nextTier: PrestigeTier | null = PRESTIGE_TIERS[1];

    for (let i = PRESTIGE_TIERS.length - 1; i >= 0; i--) {
        if (unlockedCount >= PRESTIGE_TIERS[i].minBadges) {
            currentTier = PRESTIGE_TIERS[i];
            nextTier = i < PRESTIGE_TIERS.length - 1 ? PRESTIGE_TIERS[i + 1] : null;
            break;
        }
    }

    const remainingForNext = nextTier ? nextTier.minBadges - unlockedCount : 0;
    return { currentTier, nextTier, remainingForNext };
}

const CATEGORIES: Array<{ id: CategoryFilter; label: string; icon: LucideIcon }> = [
    { id: 'ALL', label: 'All Badges', icon: Trophy },
    { id: 'SKILL', label: 'Skill', icon: Zap },
    { id: 'HARDCORE', label: 'Hardcore', icon: Skull },
    { id: 'GRIND', label: 'Endurance', icon: Flame },
    { id: 'SUPER', label: 'Super', icon: Sparkles },
];

export function HallOfLegendsPanel({
    unlockedIds,
    accent,
    isOwnProfile = true,
}: HallOfLegendsPanelProps) {
    const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const totalBadges = ACHIEVEMENTS.length;
    const unlockedCount = useMemo(() => {
        return ACHIEVEMENTS.filter((ach) => unlockedIds.has(ach.id)).length;
    }, [unlockedIds]);

    const progressPercentage = Math.round((unlockedCount / totalBadges) * 100);
    const { currentTier, nextTier, remainingForNext } = useMemo(
        () => getPrestigeRank(unlockedCount),
        [unlockedCount]
    );

    const categoryStats = useMemo(() => {
        const stats: Record<CategoryFilter, { total: number; unlocked: number }> = {
            ALL: { total: totalBadges, unlocked: unlockedCount },
            SKILL: { total: 0, unlocked: 0 },
            HARDCORE: { total: 0, unlocked: 0 },
            GRIND: { total: 0, unlocked: 0 },
            SUPER: { total: 0, unlocked: 0 },
        };

        for (const ach of ACHIEVEMENTS) {
            const cat = ach.category as CategoryFilter;
            if (stats[cat]) {
                stats[cat].total += 1;
                if (unlockedIds.has(ach.id)) {
                    stats[cat].unlocked += 1;
                }
            }
        }
        return stats;
    }, [unlockedIds, totalBadges, unlockedCount]);

    const filteredBadges = useMemo(() => {
        return ACHIEVEMENTS.filter((ach) => {
            if (selectedCategory !== 'ALL' && ach.category !== selectedCategory) {
                return false;
            }
            const isUnlocked = unlockedIds.has(ach.id);
            if (statusFilter === 'unlocked' && !isUnlocked) return false;
            if (statusFilter === 'locked' && isUnlocked) return false;

            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchesTitle = ach.title.toLowerCase().includes(query);
                const matchesDesc = ach.desc.toLowerCase().includes(query);
                const matchesCategory = ach.category.toLowerCase().includes(query);
                return matchesTitle || matchesDesc || matchesCategory;
            }
            return true;
        });
    }, [selectedCategory, statusFilter, searchQuery, unlockedIds]);

    const PrestigeIcon = currentTier.icon;

    return (
        <div className="space-y-6">
            {/* ── Prestige Header & Progress Bar ── */}
            <div
                className="relative overflow-hidden rounded-2xl border p-5 md:p-6 backdrop-blur-xl transition-all"
                style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.45)',
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
                }}
            >
                {/* Background Ambient Glow */}
                <div
                    className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl opacity-20"
                    style={{ backgroundColor: `rgb(${accent})` }}
                />

                <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    {/* Rank Badge Info */}
                    <div className="flex items-center gap-4">
                        <div
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border"
                            style={{
                                backgroundColor: rgba(accent, 0.12),
                                borderColor: rgba(accent, 0.35),
                                boxShadow: `0 0 20px rgba(${accent}, 0.25)`,
                                color: `rgb(${accent})`,
                            }}
                        >
                            <PrestigeIcon size={28} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span
                                    className="text-[10px] font-black uppercase tracking-wider rounded-md px-2 py-0.5"
                                    style={{
                                        backgroundColor: rgba(accent, 0.15),
                                        color: `rgb(${accent})`,
                                        border: `1px solid ${rgba(accent, 0.25)}`,
                                    }}
                                >
                                    {currentTier.tierName}
                                </span>
                                <span className="text-xs text-white/50 font-medium">Prestige Standing</span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-black tracking-tight text-white mt-1">
                                {currentTier.title}
                            </h3>
                            <p className="text-xs text-white/60 mt-0.5 max-w-md">
                                {isOwnProfile
                                    ? currentTier.description
                                    : `Public badge record for this operator. ${currentTier.description}`}
                            </p>
                        </div>
                    </div>

                    {/* Milestone & Metrics Counter */}
                    <div className="flex flex-col md:items-end gap-1.5 border-t md:border-t-0 border-white/10 pt-3 md:pt-0">
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl md:text-3xl font-black text-white tracking-tight">
                                {unlockedCount}
                            </span>
                            <span className="text-sm font-semibold text-white/40">/ {totalBadges}</span>
                            <span
                                className="text-xs font-black tracking-wide ml-1.5"
                                style={{ color: `rgb(${accent})` }}
                            >
                                ({progressPercentage}%)
                            </span>
                        </div>
                        <span className="text-xs text-white/50">
                            {nextTier
                                ? `${remainingForNext} more badge${remainingForNext === 1 ? '' : 's'} to ${nextTier.title}`
                                : 'All milestones conquered · Terminal Legend'}
                        </span>
                    </div>
                </div>

                {/* Smooth Progress Bar */}
                <div className="relative mt-5 pt-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06] border border-white/10">
                        <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                                width: `${progressPercentage}%`,
                                backgroundColor: `rgb(${accent})`,
                                boxShadow: `0 0 12px rgba(${accent}, 0.6)`,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* ── Control Bar: Category Pills + Search + Unlocked Status ── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
                {/* Category Selection Pills */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10 w-fit">
                    {CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        const isSelected = selectedCategory === cat.id;
                        const stats = categoryStats[cat.id];

                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    isSelected
                                        ? 'text-white shadow-sm'
                                        : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                                }`}
                                style={
                                    isSelected
                                        ? {
                                              backgroundColor: rgba(accent, 0.18),
                                              border: `1px solid ${rgba(accent, 0.4)}`,
                                              color: `rgb(${accent})`,
                                              boxShadow: `0 0 12px rgba(${accent}, 0.2)`,
                                          }
                                        : { border: '1px solid transparent' }
                                }
                            >
                                <Icon size={13} className="shrink-0" />
                                <span>{cat.label}</span>
                                <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                        isSelected
                                            ? 'bg-white/15 text-white'
                                            : 'bg-white/5 text-white/40'
                                    }`}
                                >
                                    {stats.unlocked}/{stats.total}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Right Filter Controls: Search & Unlock Filter */}
                <div className="flex items-center gap-2">
                    {/* Status Pill Filter */}
                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs">
                        {(['all', 'unlocked', 'locked'] as const).map((status) => (
                            <button
                                key={status}
                                type="button"
                                onClick={() => setStatusFilter(status)}
                                className={`px-2.5 py-1 rounded-md capitalize text-[11px] font-medium transition-all cursor-pointer ${
                                    statusFilter === status
                                        ? 'bg-white/10 text-white shadow-sm'
                                        : 'text-white/50 hover:text-white/80'
                                }`}
                                style={
                                    statusFilter === status
                                        ? {
                                              color: `rgb(${accent})`,
                                          }
                                        : undefined
                                }
                            >
                                {status}
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative min-w-[160px] sm:min-w-[200px]">
                        <Search
                            size={13}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter badges..."
                            className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-white/30 focus:outline-none transition-all"
                            style={{
                                borderColor: searchQuery ? rgba(accent, 0.4) : undefined,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* ── Badges Grid ── */}
            {filteredBadges.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-white/10 bg-white/[0.02]">
                    <Trophy size={32} className="text-white/20 mb-3" />
                    <p className="text-sm font-semibold text-white/70">No conquest badges match your filter</p>
                    <p className="text-xs text-white/40 mt-1 max-w-sm">
                        Try resetting the category filter or search query to view the full Hall of Legends roster.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedCategory('ALL');
                            setStatusFilter('all');
                            setSearchQuery('');
                        }}
                        className="mt-4 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer"
                    >
                        Reset Filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                    {filteredBadges.map((ach) => {
                        const isUnlocked = unlockedIds.has(ach.id);
                        const AchIcon = achievementIcon(ach.icon);
                        const isSuper = ach.category === 'SUPER';

                        return (
                            <div
                                key={ach.id}
                                className={`group relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-300 ${
                                    isUnlocked
                                        ? 'bg-black/50 hover:bg-black/65 hover:-translate-y-0.5'
                                        : 'bg-black/35 opacity-60 hover:opacity-85 hover:bg-black/50'
                                }`}
                                style={{
                                    borderColor: isUnlocked
                                        ? isSuper
                                            ? rgba(accent, 0.45)
                                            : rgba(accent, 0.25)
                                        : 'rgba(255, 255, 255, 0.07)',
                                    boxShadow: isUnlocked
                                        ? `0 4px 20px rgba(0, 0, 0, 0.4), 0 0 16px rgba(${accent}, 0.08)`
                                        : 'none',
                                }}
                            >
                                {/* Radial Backlight on Unlocked Cards */}
                                {isUnlocked && (
                                    <div
                                        className="pointer-events-none absolute inset-0 rounded-2xl opacity-15 transition-opacity group-hover:opacity-25"
                                        style={{
                                            background: `radial-gradient(circle at 50% 30%, rgb(${accent}) 0%, transparent 70%)`,
                                        }}
                                    />
                                )}

                                {/* Top Row: Category tag + Lock/Unlock Pill */}
                                <div className="relative z-10 flex items-center justify-between mb-3">
                                    <span
                                        className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                            isSuper
                                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                                : 'bg-white/5 text-white/50 border-white/10'
                                        }`}
                                    >
                                        {ach.category}
                                    </span>

                                    {isUnlocked ? (
                                        <div
                                            className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                                            style={{
                                                backgroundColor: rgba(accent, 0.15),
                                                borderColor: rgba(accent, 0.35),
                                                color: `rgb(${accent})`,
                                            }}
                                        >
                                            <Check size={10} strokeWidth={3} />
                                            <span>EARNED</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-[10px] font-semibold text-white/40 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                                            <Lock size={10} />
                                            <span>LOCKED</span>
                                        </div>
                                    )}
                                </div>

                                {/* Center: Icon and Titles */}
                                <div className="relative z-10 flex flex-col items-center text-center py-2">
                                    <div
                                        className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105"
                                        style={{
                                            backgroundColor: isUnlocked
                                                ? rgba(accent, 0.12)
                                                : 'rgba(255, 255, 255, 0.04)',
                                            border: `1px solid ${
                                                isUnlocked
                                                    ? rgba(accent, 0.3)
                                                    : 'rgba(255, 255, 255, 0.08)'
                                            }`,
                                            color: isUnlocked
                                                ? `rgb(${accent})`
                                                : 'rgba(255, 255, 255, 0.35)',
                                            boxShadow: isUnlocked
                                                ? `0 0 16px rgba(${accent}, 0.2)`
                                                : 'none',
                                        }}
                                    >
                                        <AchIcon size={26} />
                                    </div>

                                    <h4
                                        className={`font-bold text-sm tracking-tight mb-1 ${
                                            isUnlocked ? 'text-white' : 'text-white/70'
                                        }`}
                                    >
                                        {ach.title}
                                    </h4>

                                    <p className="text-xs text-white/50 leading-relaxed max-w-[220px]">
                                        {ach.desc}
                                    </p>
                                </div>

                                {/* Bottom Accent Line / Subtext */}
                                <div className="relative z-10 mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-white/40">
                                    <span>Badge #{ach.id}</span>
                                    <span
                                        className="font-medium"
                                        style={{
                                            color: isUnlocked ? `rgb(${accent})` : undefined,
                                        }}
                                    >
                                        {isUnlocked ? 'Etched in Dossier' : 'Milestone Locked'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
