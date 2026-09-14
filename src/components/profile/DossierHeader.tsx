// ═══════════════════════════════════════════════════════════════════════
//  DOSSIER HEADER — identity, at the top of the page instead of beside it
//  ---------------------------------------------------------------------
//  This replaces a 340px sticky left rail. The rail had three problems that were
//  structural rather than cosmetic:
//
//    1. It was `self-start` with a `max-h`, so it ended where its content ended
//       — and its `border-r`, the only thing drawing the boundary between the two
//       columns, died with it about two thirds of the way down the viewport.
//    2. It restated level progress four times (a ring, a pill, a segmented bar,
//       and "361 XP → LVL 5") while the deck beside it restated it four more.
//    3. The second-largest line in it was "BANNER · MIDNIGHT GOLD" — the name of
//       a cosmetic, given the position where identity belongs.
//
//  The shape here is the one every profile page converges on for a reason: an
//  art band, then a solid strip with the avatar straddling the seam. Nothing
//  legible sits on top of the art, so contrast stops depending on which banner
//  the operator equipped — which is the same reason the page as a whole stopped
//  floating on the user's wallpaper.
//
//  Level progress appears exactly once, as the ring around the avatar.
// ═══════════════════════════════════════════════════════════════════════

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Award } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BannerArt } from '@/components/profile/CosmeticArt';
import { AvatarArt } from '@/components/profile/AvatarKeycap';
import { RadialMeter } from '@/components/profile/ProfileFx';
import { Figure, FigureRow, type FigureSize } from '@/components/profile/DossierPieces';
import { rgba, springSnappy } from '@/components/profile/profileMotion';
import { isPatronTitle } from '@/data/donation';

export interface HeaderFigure {
    label: string;
    value: number;
    unit?: string;
    decimals?: number;
    caption?: ReactNode;
    unavailable?: string;
}

export function DossierHeader({
    username,
    isOwnProfile,
    bannerId,
    avatarId,
    accent,
    avatarAccent,
    level,
    levelProgressPct,
    xpToNext,
    titleName,
    titleId,
    // Aliased on the way in because JSX resolves a lowercase tag to an HTML
    // element, so a component prop has to arrive under a capitalised name.
    titleIcon: TitleIcon,
    onOpenTitles,
    onViewCertificate,
    figures,
    action,
    reduce,
}: {
    username: string;
    isOwnProfile: boolean;
    bannerId: string;
    avatarId: string;
    accent: string;
    avatarAccent: string;
    level: number;
    /** 0…100 — drawn as the ring, and stated nowhere else on the page. */
    levelProgressPct: number;
    xpToNext: number;
    titleName: string;
    titleId?: string;
    titleIcon: LucideIcon;
    /** Own dossier only: jumps to the registry. */
    onOpenTitles?: () => void;
    /** Verified supporter only: opens the official digital certificate modal. */
    onViewCertificate?: () => void;
    figures: HeaderFigure[];
    /** The page's one primary action for this operator. */
    action?: ReactNode;
    reduce: boolean | null;
}) {
    /* Four figures fit the strip at `lg`; a fifth would either wrap or shrink
       the display size below the point where it reads as the headline. */
    const size: FigureSize = figures.length > 3 ? 'md' : 'lg';

    return (
        <header className="relative">
            {/* ── Art band ──
                `detail="full"` because this is now the largest instance of the
                banner in the app and the only place its detail is legible; the
                forge's picker and the old rail both used `compact` precisely
                because they were small. Darkened here rather than in the art so
                one scene serves both. */}
            <div className="relative h-[132px] overflow-hidden sm:h-[168px]">
                <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{ filter: 'brightness(0.68) saturate(1.18)' }}
                >
                    <BannerArt id={bannerId} detail="full" animate={!reduce} />
                </div>
                {/* Two scrims, two jobs: the vertical one lands the art on the
                    page floor with no seam, the accent bloom keeps the band from
                    reading as a grey box under a dark banner. */}
                <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                        background:
                            'linear-gradient(180deg, rgba(9,11,16,0.18) 0%, rgba(9,11,16,0.48) 58%, var(--dsr-floor) 100%)',
                    }}
                />
                <motion.div
                    aria-hidden
                    className="pointer-events-none absolute -top-24 left-[12%] h-64 w-64 rounded-full blur-3xl"
                    style={{ background: rgba(accent, 0.35) }}
                    animate={reduce ? undefined : {
                        scale: [1, 1.25, 1],
                        opacity: [0.6, 0.95, 0.6],
                        x: [0, 35, 0],
                        y: [0, -15, 0],
                    }}
                    transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    aria-hidden
                    className="pointer-events-none absolute -top-20 right-[16%] h-56 w-56 rounded-full blur-3xl"
                    style={{ background: rgba(accent, 0.24) }}
                    animate={reduce ? undefined : {
                        scale: [1.2, 0.95, 1.2],
                        opacity: [0.35, 0.7, 0.35],
                        x: [0, -30, 0],
                    }}
                    transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                />
            </div>

            {/* ── Identity strip ──
                Sits on the page floor, so every glyph in it has a known
                background. */}
            <div className="relative flex flex-col gap-6 pb-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
                {/* Reveals through the same mechanism as everything below it, so
                    the page has one entrance vocabulary rather than a bespoke one
                    for its header. On screen at mount, so it fires on the
                    observer's first callback and arrives rather than appearing. */}
                <div data-reveal className="flex min-w-0 items-end gap-4 sm:gap-5">
                    {/* The avatar straddles the seam, which is what ties the two
                        zones together without a border between them. */}
                    <div className="-mt-[52px] shrink-0 sm:-mt-[60px]">
                        <RadialMeter
                            value={levelProgressPct / 100}
                            size={112}
                            stroke={2.5}
                            color={accent}
                            delay={0.25}
                        >
                            <motion.div
                                whileHover={reduce ? undefined : { y: -3 }}
                                whileTap={reduce ? undefined : { y: 2 }}
                                transition={springSnappy}
                                className="relative flex items-center justify-center"
                                style={{
                                    filter: `drop-shadow(0 8px 18px rgba(0,0,0,0.6)) drop-shadow(0 0 20px ${rgba(avatarAccent, 0.35)})`,
                                }}
                            >
                                <AvatarArt id={avatarId} size={82} />
                            </motion.div>
                        </RadialMeter>
                    </div>

                    <div className="min-w-0 pb-1">
                        <div className="flex items-center gap-2.5">
                            <h1 className="dsr-figure truncate text-[clamp(26px,3vw,38px)]">{username}</h1>
                            {isOwnProfile && (
                                <span
                                    className="dsr-label shrink-0 rounded-full px-2 py-[3px] text-[10px] leading-none"
                                    style={{
                                        color: rgba(accent, 1),
                                        background: rgba(accent, 0.14),
                                        border: `1px solid ${rgba(accent, 0.32)}`,
                                    }}
                                >
                                    You
                                </span>
                            )}
                        </div>

                        {/* One metadata line. The title is the only part of it
                            that is a control, and only on your own dossier. */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                            {(() => {
                                const isPatron = titleId ? isPatronTitle(titleId) : false;
                                return onOpenTitles ? (
                                    <button
                                        type="button"
                                        onClick={onOpenTitles}
                                        className={`dsr-interactive flex items-center gap-1.5 rounded-full px-2.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                                            isPatron ? 'holographic-title-badge' : ''
                                        }`}
                                        title="Open the title registry"
                                    >
                                        <TitleIcon size={13} aria-hidden style={{ color: isPatron ? '#fbbf24' : rgba(accent, 0.85) }} />
                                        <span className={`dsr-body text-[13px] ${isPatron ? 'holographic-title-text' : 'text-[var(--dsr-ink)]'}`}>{titleName}</span>
                                        <ChevronRight size={12} className={isPatron ? 'text-amber-300' : 'text-[var(--dsr-ink-3)]'} aria-hidden />
                                    </button>
                                ) : (
                                    <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                                        isPatron ? 'holographic-title-badge' : 'border border-[var(--dsr-line)]'
                                    }`}>
                                        <TitleIcon size={13} aria-hidden style={{ color: isPatron ? '#fbbf24' : rgba(accent, 0.85) }} />
                                        <span className={`dsr-body text-[13px] ${isPatron ? 'holographic-title-text' : 'text-[var(--dsr-ink)]'}`}>{titleName}</span>
                                    </span>
                                );
                            })()}
                            <span className="dsr-body text-[13px]">
                                Level {level}
                                <span className="text-[var(--dsr-ink-3)]">
                                    {' · '}
                                    {xpToNext.toLocaleString()} XP to {level + 1}
                                </span>
                            </span>

                            {onViewCertificate && (
                                <button
                                    type="button"
                                    onClick={onViewCertificate}
                                    className="dsr-interactive group flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-500/10 px-2.5 py-1 text-amber-300 outline-none transition-all hover:border-amber-400/60 hover:bg-amber-500/20 hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-400/40"
                                    title="View verified digital patron certificate"
                                >
                                    <Award size={13} className="text-amber-400 transition-transform group-hover:scale-110" aria-hidden />
                                    <span className="dsr-body text-[13px] font-medium">Certificate</span>
                                </button>
                            )}
                        </div>

                        {action && <div className="mt-4">{action}</div>}
                    </div>
                </div>

                {/* Headline figures. Hairline-divided, no frames — the comparison
                    being made is between the numbers. */}
                <div
                    data-reveal
                    // A beat behind the identity block, so the two read as one
                    // arrival with a direction rather than a simultaneous pop.
                    style={{ '--reveal-delay': '110ms' } as React.CSSProperties}
                    className="shrink-0 border-t border-[var(--dsr-line)] pt-4 lg:border-t-0 lg:pt-0"
                >
                    <FigureRow cols={figures.length > 3 ? 4 : 3}>
                        {figures.map((f) => (
                            <Figure
                                key={f.label}
                                label={f.label}
                                value={f.value}
                                unit={f.unit}
                                decimals={f.decimals}
                                caption={f.caption}
                                unavailable={f.unavailable}
                                size={size}
                                accent={accent}
                            />
                        ))}
                    </FigureRow>
                </div>
            </div>
        </header>
    );
}
