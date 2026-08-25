import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ChevronRight, Crown, Flame, Gauge, Layers, LayoutGrid, List, Lock, Play, Search,
  Star, Timer, Trophy, X,
} from 'lucide-react';
import {
  LESSONS,
  TRACKS,
  CATEGORY_LABELS,
  TOTAL_STARS_POSSIBLE,
  MAX_ACADEMY_LEVEL,
  getTrackProgress,
  getLessonById,
  getNextLesson,
  type LessonCategory,
  type AcademyLesson,
  type MasteryProgress,
} from '@/data/academyCurriculum';
import type { LessonRecord, DayStreak } from '@/hooks/useAcademyEngine';
import type { Theme } from '@/data/constants';
import {
  EASE_OUT, enter, fadeDown, fadeUp, laneIn, listChild, listParent,
  springFluid, springSnappy,
} from './academyMotion';
import {
  CATEGORY_ICONS, DEFAULT_GLOW, glow, LABEL, LINE, LINE_STRONG, nodeLayoutId,
  PANEL, panelStyle, SURFACE, tint, TONE,
} from './academyTheme';
import {
  AnimatedNumber, DifficultyPips, MasteryIcon, Meter, StarRow, StatTile,
} from './AcademyPrimitives';

// ═══════════════════════════════════════════════════════════════════════
//  Why this screen is built the way it is
//  ---------------------------------------------------------------------
//  It used to render all ten tracks as horizontal lanes with every lesson
//  mounted at once — ~60 cards, each a framer `layoutId` shared element.
//  Framer measures every projection node on render and on scroll, so the
//  page paid for 60 shared elements on every scroll frame to buy a single
//  400ms launch animation. That was the jank.
//
//  Now the browse surface is scoped:
//    · Tracks view  — one track at a time, ~6-8 cards mounted, in a grid
//                     rather than hidden behind horizontal overflow.
//    · All lessons  — every lesson at once, but as cheap static rows with
//                     search and filters. No layout animation, no layoutId.
//
//  Only the cards in the open track keep `layoutId`, so the card → stage
//  handoff survives at a tenth of the cost.
// ═══════════════════════════════════════════════════════════════════════

type BrowseMode = 'tracks' | 'all';
type StatusFilter = 'all' | 'todo' | 'mastered' | 'locked';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Any status' },
  { key: 'todo', label: 'Not cleared' },
  { key: 'mastered', label: 'Mastered' },
  { key: 'locked', label: 'Locked' },
];

interface AcademySkillTreeProps {
  mastery: MasteryProgress;
  academyXp: number;
  totalStars: number;
  lessonsCleared: number;
  nodeStars: Record<string, number>;
  records: Record<string, LessonRecord>;
  dayStreak: DayStreak;
  unlockedNodeIds: Set<string>;
  onSelectNode: (nodeId: string) => void;
  theme?: Theme;
}

// ── A single lesson card (tracks view only) ──────────────────────────

function NodeCard({
  lesson, isUnlocked, stars, record, accent, reduce, onSelect,
}: {
  lesson: AcademyLesson;
  isUnlocked: boolean;
  stars: number;
  record?: LessonRecord;
  accent: string;
  reduce: boolean;
  onSelect: (id: string) => void;
}) {
  const isMastered = stars >= 3;
  const isBoss = !!lesson.isBossNode;
  const gateNames = isUnlocked
    ? ''
    : lesson.prerequisites.map(id => getLessonById(id)?.title).filter(Boolean).join(' · ');

  const border = !isUnlocked
    ? LINE
    : isMastered
      ? `${accent}77`
      : isBoss
        ? `${TONE.boss}55`
        : LINE_STRONG;

  return (
    /*
      Two elements on purpose. The outer one owns `layoutId`, so framer's
      projection system drives its transform during the launch handoff; the
      inner one owns the hover lift. When both lived on the same element the
      hover transform and the projection transform fought over it and the
      card's top edge sheared off mid-lift.
    */
    <motion.div
      // Affordable now that only one track's worth of cards is mounted.
      layoutId={nodeLayoutId(lesson.id)}
      variants={listChild}
      transition={springFluid}
      className="h-full"
    >
      <motion.button
        type="button"
        disabled={!isUnlocked}
        onClick={() => isUnlocked && onSelect(lesson.id)}
        variants={{
          hover: { y: -5, transition: springSnappy },
          tap: { scale: 0.985, transition: springSnappy },
        }}
        whileHover={isUnlocked && !reduce ? 'hover' : undefined}
        whileTap={isUnlocked && !reduce ? 'tap' : undefined}
        style={{
          borderColor: border,
          // Opaque, never blurred — the app shell already blurs the wallpaper
          // behind the Academy. Raised surface opacity carries the elevation.
          background: isUnlocked ? panelStyle('raised').background : panelStyle('base').background,
        }}
        className={`group relative flex h-full w-full flex-col gap-2.5 overflow-hidden rounded-2xl border
          p-4 text-left transition-colors duration-200
          ${isUnlocked ? 'cursor-pointer hover:border-white/25' : 'cursor-not-allowed opacity-60'}`}
      >
        {/* Cursor-agnostic spotlight. CSS handles the fade so hover never queues a layout pass. */}
        {isUnlocked && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: `radial-gradient(340px circle at 50% -40%, ${accent}1a, transparent 70%)` }}
          />
        )}

        {/* status row */}
        <div className="relative flex items-center justify-between gap-2">
          <DifficultyPips level={lesson.difficulty} accent={isUnlocked ? accent : '#52525b'} />

          {isBoss ? (
            <span
              className="flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider"
              style={{ borderColor: `${TONE.boss}55`, background: `${TONE.boss}18`, color: TONE.boss }}
            >
              <Trophy size={10} /> Boss
            </span>
          ) : isMastered ? (
            <span
              className="flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider"
              style={{ borderColor: `${accent}55`, background: `${accent}18`, color: accent }}
            >
              <Crown size={10} /> Mastered
            </span>
          ) : null}
        </div>

        {/* title + blurb */}
        <div className="relative">
          <h4 className="font-sans text-[14px] font-semibold leading-snug text-zinc-100 line-clamp-2">
            {lesson.title}
          </h4>
          <p className="mt-1 font-sans text-[12px] leading-relaxed text-zinc-400 line-clamp-2">
            {lesson.description}
          </p>
        </div>

        {/* stars + personal best */}
        <div className="relative flex items-center justify-between">
          {isUnlocked ? (
            <StarRow stars={stars} animate={!reduce} />
          ) : (
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
              <Lock size={11} /> Locked
            </span>
          )}
          {record && record.bestWpm > 0 && (
            <span className="font-mono text-[10px] tabular-nums text-zinc-500">
              {record.bestWpm} wpm · {record.bestAccuracy}%
            </span>
          )}
        </div>

        {/* footer meta */}
        <div
          className="relative mt-auto flex items-center justify-between border-t pt-2.5"
          style={{ borderColor: LINE }}
        >
          <span className="flex items-center gap-3 font-mono text-[10px] tabular-nums text-zinc-500">
            <span className="flex items-center gap-1"><Timer size={11} />{lesson.estMinutes}m</span>
            <span className="flex items-center gap-1"><Gauge size={11} />{lesson.targetWpm}</span>
          </span>

          {isUnlocked ? (
            <span
              className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-transform duration-300 group-hover:translate-x-0.5"
              style={{ color: accent }}
            >
              {stars > 0 ? 'Replay' : 'Start'}
              <Play size={10} style={{ fill: accent }} />
            </span>
          ) : gateNames ? (
            <span className="max-w-[130px] truncate font-sans text-[10px] text-zinc-600" title={gateNames}>
              Needs {gateNames}
            </span>
          ) : null}
        </div>
      </motion.button>
    </motion.div>
  );
}

// ── A single row in the all-lessons table ────────────────────────────
//
// Deliberately a plain button with CSS transitions: sixty of these are on
// screen at once, so none of them may cost a projection node or a variant
// subscription. Hover and focus are handled entirely by the compositor.

function LessonRow({
  lesson, isUnlocked, stars, record, onSelect,
}: {
  lesson: AcademyLesson;
  isUnlocked: boolean;
  stars: number;
  record?: LessonRecord;
  onSelect: (id: string) => void;
}) {
  const meta = CATEGORY_LABELS[lesson.category];
  const isMastered = stars >= 3;

  return (
    <button
      type="button"
      disabled={!isUnlocked}
      onClick={() => isUnlocked && onSelect(lesson.id)}
      className={`group flex w-full items-center gap-3 border-b px-3 py-2.5 text-left
        transition-colors duration-150 last:border-b-0
        ${isUnlocked ? 'cursor-pointer hover:bg-white/[0.04]' : 'cursor-not-allowed opacity-55'}`}
      style={{ borderColor: LINE }}
    >
      {/* status */}
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border"
        style={{
          borderColor: isUnlocked ? `${meta.color}44` : LINE,
          background: isUnlocked ? `${meta.color}14` : 'transparent',
          color: isUnlocked ? meta.color : '#52525b',
        }}
      >
        {!isUnlocked ? <Lock size={12} />
          : lesson.isBossNode ? <Trophy size={12} />
            : isMastered ? <Crown size={12} />
              : <Play size={11} />}
      </span>

      {/* title + track */}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-sans text-[13px] font-semibold text-zinc-100">
          {lesson.title}
        </span>
        <span className="truncate font-sans text-[11px] text-zinc-500">
          <span style={{ color: `${meta.color}cc` }}>{meta.short}</span>
          <span className="text-zinc-700"> · </span>
          {lesson.description}
        </span>
      </span>

      {/* difficulty */}
      <span className="hidden shrink-0 lg:block">
        <DifficultyPips level={lesson.difficulty} accent={isUnlocked ? meta.color : '#52525b'} />
      </span>

      {/* targets */}
      <span className="hidden shrink-0 items-center gap-3 font-mono text-[10px] tabular-nums text-zinc-500 sm:flex">
        <span className="flex w-12 items-center gap-1"><Gauge size={11} />{lesson.targetWpm}</span>
        <span className="flex w-10 items-center gap-1"><Timer size={11} />{lesson.estMinutes}m</span>
      </span>

      {/* personal best */}
      <span className="hidden w-[92px] shrink-0 text-right font-mono text-[10px] tabular-nums text-zinc-500 md:block">
        {record && record.bestWpm > 0 ? `${record.bestWpm} wpm · ${record.bestAccuracy}%` : '—'}
      </span>

      {/* stars */}
      <span className="w-[58px] shrink-0">
        <StarRow stars={stars} size={12} animate={false} />
      </span>

      <ChevronRight
        size={14}
        className={`shrink-0 text-zinc-600 transition-transform duration-200
          ${isUnlocked ? 'group-hover:translate-x-0.5 group-hover:text-zinc-300' : ''}`}
      />
    </button>
  );
}

// ── The Academy browse surface ───────────────────────────────────────

export function AcademySkillTree({
  mastery,
  academyXp,
  totalStars,
  lessonsCleared,
  nodeStars,
  records,
  dayStreak,
  unlockedNodeIds,
  onSelectNode,
  theme,
}: AcademySkillTreeProps) {
  const reduce = !!useReducedMotion();
  const themeGlow = theme?.glowPrimary || DEFAULT_GLOW;
  const accent = `rgb(${themeGlow})`;

  const nextLesson = useMemo(() => getNextLesson(nodeStars), [nodeStars]);

  const [mode, setMode] = useState<BrowseMode>('tracks');
  /** Opens on the track the learner is actually working through, not track 01. */
  const [activeTrack, setActiveTrack] = useState<LessonCategory>(
    () => getNextLesson(nodeStars)?.category ?? TRACKS[0].category,
  );
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [trackFilter, setTrackFilter] = useState<LessonCategory | 'all'>('all');

  const bestWpm = useMemo(
    () => Object.values(records).reduce((m, r) => Math.max(m, r.bestWpm), 0),
    [records],
  );

  /** Per-track counts for the rail: computed once per star change, not per render. */
  const trackStats = useMemo(
    () => TRACKS.map(t => ({
      track: t,
      progress: getTrackProgress(t.category, nodeStars),
      unlocked: t.lessons.some(l => unlockedNodeIds.has(l.id)),
    })),
    [nodeStars, unlockedNodeIds],
  );

  const open = trackStats.find(s => s.track.category === activeTrack) ?? trackStats[0];
  const openMeta = CATEGORY_LABELS[open.track.category];
  const OpenIcon = CATEGORY_ICONS[open.track.category];

  /** All-lessons view: search + track + status, applied in that order. */
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LESSONS.filter(l => {
      if (trackFilter !== 'all' && l.category !== trackFilter) return false;

      const stars = nodeStars[l.id] || 0;
      const unlocked = unlockedNodeIds.has(l.id);
      if (status === 'locked' && unlocked) return false;
      if (status === 'mastered' && stars < 3) return false;
      if (status === 'todo' && (!unlocked || stars > 0)) return false;

      if (!q) return true;
      return l.title.toLowerCase().includes(q)
        || l.description.toLowerCase().includes(q)
        || CATEGORY_LABELS[l.category].name.toLowerCase().includes(q);
    });
  }, [query, trackFilter, status, nodeStars, unlockedNodeIds]);

  const xpPct = mastery.isMax ? 100 : mastery.progressPercent;
  const filtersActive = query.trim() !== '' || status !== 'all' || trackFilter !== 'all';

  const trackChips: { key: LessonCategory | 'all'; label: string; color: string }[] = useMemo(
    () => [
      { key: 'all', label: 'All tracks', color: accent },
      ...TRACKS.map(t => ({ key: t.category, label: t.meta.short, color: t.meta.color })),
    ],
    [accent],
  );

  const clearFilters = () => {
    setQuery('');
    setStatus('all');
    setTrackFilter('all');
  };

  return (
    <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-4">

      {/* ── MASTERY HEADER ───────────────────────────────────────── */}
      <motion.div
        {...enter(reduce, fadeDown)}
        className={`relative overflow-hidden p-5 sm:p-6 ${PANEL}`}
        style={panelStyle('base')}
      >
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <motion.div
              whileHover={reduce ? undefined : { scale: 1.06, rotate: -4 }}
              transition={springSnappy}
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border"
              style={{
                borderColor: `${mastery.title.color}55`,
                background: `${mastery.title.color}16`,
                color: mastery.title.color,
              }}
            >
              <MasteryIcon level={mastery.level} size={26} />
            </motion.div>

            <div className="min-w-0">
              <h2 className="font-sans text-xl font-bold tracking-tight text-white sm:text-2xl">
                Neural Academy
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] tabular-nums text-zinc-400">
                  Level {mastery.level}
                  <span className="text-zinc-600">/{MAX_ACADEMY_LEVEL}</span>
                </span>
                <span className="text-zinc-700">·</span>
                <span className="font-sans text-[12px] font-medium" style={{ color: mastery.title.color }}>
                  {mastery.title.title}
                </span>
                {dayStreak.current > 1 && (
                  <motion.span
                    {...enter(reduce, fadeUp)}
                    className="flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums"
                    style={{ borderColor: `${TONE.boss}44`, background: `${TONE.boss}16`, color: TONE.boss }}
                  >
                    <Flame size={10} /> {dayStreak.current}d
                  </motion.span>
                )}
              </div>
              <p className="mt-1 font-sans text-[12px] text-zinc-500">
                {LESSONS.length} lessons across {TRACKS.length} tracks
              </p>
            </div>
          </div>

          {/* mastery xp */}
          <div className="w-full shrink-0 xl:w-[320px]">
            <div className="mb-1.5 flex items-center justify-between">
              <span className={LABEL}>Mastery XP</span>
              <span className="font-mono text-[11px] font-bold tabular-nums text-zinc-200">
                {mastery.isMax ? 'MAX' : `${mastery.xpIntoLevel} / ${mastery.xpForNextLevel}`}
              </span>
            </div>
            <Meter percent={xpPct} color={accent} glowColor={glow(themeGlow, 0.55)} height={8} />
            <p className="mt-1.5 font-mono text-[10px] tabular-nums text-zinc-500">
              <AnimatedNumber value={academyXp} /> lifetime XP
            </p>
          </div>
        </div>

        {/* three stats, not eight */}
        <motion.div
          {...(reduce ? {} : { variants: listParent(0.07, 0.12), initial: 'hidden', animate: 'show' })}
          className="mt-5 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:thin]"
        >
          {[
            { icon: <Star size={15} />, label: 'Stars', value: totalStars, suffix: ` /${TOTAL_STARS_POSSIBLE}` },
            { icon: <Layers size={15} />, label: 'Cleared', value: lessonsCleared, suffix: ` /${LESSONS.length}` },
            { icon: <Gauge size={15} />, label: 'Best WPM', value: bestWpm },
          ].map(stat => (
            <motion.div key={stat.label} {...(reduce ? {} : { variants: listChild })}>
              <StatTile {...stat} accent={accent} />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── CONTINUE — the one element on this screen that glows ── */}
      {nextLesson && (
        <motion.button
          type="button"
          onClick={() => onSelectNode(nextLesson.id)}
          {...enter(reduce, {
            ...fadeUp,
            hover: { y: -3, transition: springSnappy },
            tap: { scale: 0.995, transition: springSnappy },
          })}
          whileHover={reduce ? undefined : 'hover'}
          whileTap={reduce ? undefined : 'tap'}
          className="group relative flex w-full flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border p-4 text-left sm:p-5"
          style={{
            borderColor: glow(themeGlow, 0.4),
            // 0.88, not 0.72: over a bright wallpaper the old fill let enough
            // light through that the white text on it stopped being readable.
            background: `linear-gradient(100deg, ${glow(themeGlow, 0.14)}, rgba(9,11,19,0.88) 55%)`,
            boxShadow: `0 10px 30px rgba(0,0,0,0.4), 0 0 24px ${glow(themeGlow, 0.16)}`,
          }}
        >
          {/* sheen sweep, driven by hover variant propagation */}
          {!reduce && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-1/4 -skew-x-12"
              initial={{ x: '-140%' }}
              variants={{ hover: { x: '520%', transition: { duration: 0.9, ease: EASE_OUT } } }}
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)' }}
            />
          )}

          {/* idle breathe on the glow ring — a slow opacity pulse, compositor-only */}
          {!reduce && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ boxShadow: `inset 0 0 26px ${glow(themeGlow, 0.1)}` }}
            />
          )}

          <div className="relative flex min-w-0 items-center gap-4">
            <div
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border"
              style={{
                borderColor: glow(themeGlow, 0.55),
                background: glow(themeGlow, 0.16),
                boxShadow: `0 0 18px ${glow(themeGlow, 0.28)}`,
              }}
            >
              <Play size={17} style={{ color: accent, fill: accent }} />
            </div>
            <div className="min-w-0">
              <span className={`block ${LABEL}`}>
                {(nodeStars[nextLesson.id] || 0) > 0 ? 'Keep going' : 'Up next'}
              </span>
              <span className="block truncate font-sans text-[15px] font-bold text-white sm:text-base">
                {nextLesson.title}
              </span>
              <span className="block truncate font-sans text-[12px] text-zinc-400">
                {CATEGORY_LABELS[nextLesson.category].name} · {nextLesson.targetWpm} wpm target · {nextLesson.estMinutes}m
              </span>
            </div>
          </div>

          <div className="relative flex shrink-0 items-center gap-3">
            <StarRow stars={nodeStars[nextLesson.id] || 0} size={16} animate={false} />
            <span
              className="flex items-center gap-1.5 rounded-xl border px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-white transition-transform duration-300 group-hover:translate-x-1"
              style={{ borderColor: glow(themeGlow, 0.6), background: glow(themeGlow, 0.2) }}
            >
              Launch
              <ChevronRight size={13} />
            </span>
          </div>
        </motion.button>
      )}

      {/* ── BROWSE MODE SWITCH ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="relative flex items-center gap-1 rounded-xl border p-1"
          style={{ borderColor: LINE, background: panelStyle('sunken').background }}
        >
          {([
            { key: 'tracks' as const, label: 'Tracks', Icon: LayoutGrid },
            { key: 'all' as const, label: `All lessons · ${LESSONS.length}`, Icon: List },
          ]).map(tab => {
            const isOn = mode === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMode(tab.key)}
                aria-pressed={isOn}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-sans text-[12px] font-medium transition-colors duration-200
                  ${isOn ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                {isOn && (
                  <motion.span
                    layoutId="academy-mode-pill"
                    transition={springFluid}
                    className="absolute inset-0 rounded-lg border"
                    style={{ borderColor: glow(themeGlow, 0.45), background: glow(themeGlow, 0.16) }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <tab.Icon size={13} style={{ color: isOn ? accent : undefined }} />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {mode === 'all' && (
          <span className="font-mono text-[11px] tabular-nums text-zinc-500">
            {rows.length} of {LESSONS.length} shown
          </span>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mode === 'tracks' ? (
          <motion.div key="tracks" {...enter(reduce, laneIn)} className="flex flex-col gap-4">

            {/* ── TRACK RAIL ───────────────────────────────────── */}
            {/*
              Banded rather than floating. The tabs used to sit straight on the
              wallpaper, and the selected one's fill was an 8%-alpha tint, so a
              light wallpaper read straight through the label.
              pt-1: overflow-x-auto clips vertically too, so the tabs need a
              sliver of headroom or their top edge is shaved off.
            */}
            <div className={`p-2 ${PANEL}`} style={panelStyle('base')}>
              <div
                className="flex gap-2 overflow-x-auto px-1 pb-1.5 pt-1 [scrollbar-width:thin]"
                style={{ scrollbarColor: `${LINE_STRONG} transparent` }}
              >
                {trackStats.map(({ track, progress, unlocked }) => {
                  const meta = CATEGORY_LABELS[track.category];
                  const Icon = CATEGORY_ICONS[track.category];
                  const isOn = track.category === open.track.category;
                  return (
                    <button
                      key={track.category}
                      type="button"
                      onClick={() => setActiveTrack(track.category)}
                      aria-pressed={isOn}
                      className={`relative w-[186px] shrink-0 overflow-hidden rounded-xl border p-3 text-left
                      transition-colors duration-200 ${isOn ? '' : 'hover:border-white/20'}`}
                      style={{
                        borderColor: isOn ? `${meta.color}88` : LINE,
                        // The track's own colour layered over an opaque surface,
                        // never instead of one. SURFACE already carries the
                        // theme tint beneath it.
                        background: isOn
                          ? `linear-gradient(${meta.color}2b, ${meta.color}12), ${SURFACE.raised}`
                          : SURFACE.sunken,
                        opacity: unlocked ? 1 : 0.62,
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border"
                          style={{
                            borderColor: `${meta.color}44`,
                            background: `${meta.color}16`,
                            color: meta.color,
                          }}
                        >
                          {unlocked ? <Icon size={14} /> : <Lock size={12} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block ${LABEL}`}>
                            Track {String(track.order).padStart(2, '0')}
                          </span>
                          <span className="block truncate font-sans text-[12px] font-semibold text-zinc-100">
                            {meta.short}
                          </span>
                        </span>
                        {progress.isComplete && (
                          <Crown size={13} className="shrink-0" style={{ color: meta.color }} />
                        )}
                      </span>

                      {/* Spans, not <Meter>: a button may only contain phrasing content. */}
                      <span className="mt-2 flex items-center gap-2">
                        <span
                          className="relative h-1 flex-1 overflow-hidden rounded-full"
                          style={{ background: tint(0.18) }}
                        >
                          <span
                            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out"
                            style={{ width: `${progress.percent}%`, background: meta.color }}
                          />
                        </span>
                        <span className="shrink-0 font-mono text-[10px] tabular-nums text-zinc-400">
                          {progress.cleared}/{progress.total}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── OPEN TRACK ───────────────────────────────────── */}
            {/* No overflow-hidden: the cards lift on hover, and a clipping
                panel shaved their top edge off as they rose. */}
            <section
              className={`relative p-4 sm:p-5 ${PANEL}`}
              style={panelStyle('sunken')}
            >
              <header className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border"
                    style={{
                      borderColor: `${openMeta.color}40`,
                      background: `${openMeta.color}14`,
                      color: openMeta.color,
                    }}
                  >
                    <OpenIcon size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={LABEL}>
                        Track {String(open.track.order).padStart(2, '0')}
                      </span>
                      {open.progress.bossCleared && (
                        <span
                          className="flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider"
                          style={{ borderColor: `${TONE.boss}55`, background: `${TONE.boss}18`, color: TONE.boss }}
                        >
                          <Trophy size={9} /> Boss cleared
                        </span>
                      )}
                    </div>
                    <h3 className="truncate font-sans text-[15px] font-bold leading-tight text-zinc-100 sm:text-base">
                      {openMeta.name}
                    </h3>
                    <p className="truncate font-sans text-[12px] text-zinc-400">{openMeta.subtitle}</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-[11px] tabular-nums text-zinc-500">
                    {open.progress.cleared}/{open.progress.total} · {open.progress.stars}/{open.progress.starsPossible}★
                  </span>
                  <Meter
                    percent={open.progress.percent}
                    color={openMeta.color}
                    height={6}
                    className="w-24 sm:w-28"
                  />
                </div>
              </header>

              {/*
                A grid, not a horizontal rail. The lane layout hid most of each
                track behind overflow with no hint that it was there.
              */}
              <motion.div
                key={open.track.category}
                {...(reduce ? {} : { variants: listParent(0.045), initial: 'hidden', animate: 'show' })}
                className="grid gap-3 p-1 -m-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
              >
                {open.track.lessons.map(lesson => (
                  <NodeCard
                    key={lesson.id}
                    lesson={lesson}
                    isUnlocked={unlockedNodeIds.has(lesson.id)}
                    stars={nodeStars[lesson.id] || 0}
                    record={records[lesson.id]}
                    accent={openMeta.color}
                    reduce={reduce}
                    onSelect={onSelectNode}
                  />
                ))}
              </motion.div>
            </section>
          </motion.div>
        ) : (
          <motion.div key="all" {...enter(reduce, laneIn)} className="flex flex-col gap-3">

            {/* ── SEARCH + FILTERS ─────────────────────────────── */}
            <div
              className={`flex flex-col gap-3 p-3 sm:p-4 ${PANEL}`}
              style={panelStyle('sunken')}
            >
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border px-3 py-2"
                  style={{ borderColor: LINE_STRONG, background: panelStyle('base').background }}
                >
                  <Search size={14} className="shrink-0 text-zinc-500" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search lessons, tracks, descriptions…"
                    aria-label="Search lessons"
                    className="w-full bg-transparent font-sans text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Clear search"
                      className="shrink-0 rounded-md p-0.5 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <X size={13} />
                    </button>
                  )}
                </label>

                <div className="flex items-center gap-1.5">
                  {STATUS_FILTERS.map(f => {
                    const isOn = status === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setStatus(f.key)}
                        aria-pressed={isOn}
                        className={`rounded-lg border px-2.5 py-1.5 font-sans text-[11px] font-medium transition-colors duration-200
                          ${isOn ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                        style={{
                          borderColor: isOn ? glow(themeGlow, 0.45) : LINE,
                          background: isOn ? glow(themeGlow, 0.14) : 'transparent',
                        }}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* track chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {trackChips.map(chip => {
                  const isOn = trackFilter === chip.key;
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setTrackFilter(chip.key)}
                      aria-pressed={isOn}
                      className={`rounded-lg border px-2.5 py-1 font-sans text-[11px] font-medium transition-colors duration-200
                        ${isOn ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                      style={{
                        borderColor: isOn ? `${chip.color}77` : LINE,
                        background: isOn ? `${chip.color}1f` : 'transparent',
                      }}
                    >
                      {chip.label}
                    </button>
                  );
                })}

                {filtersActive && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="ml-1 flex items-center gap-1 rounded-lg px-2 py-1 font-sans text-[11px] font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <X size={12} /> Clear
                  </button>
                )}
              </div>
            </div>

            {/* ── TABLE ────────────────────────────────────────── */}
            <div className={`overflow-hidden ${PANEL}`} style={panelStyle('sunken')}>
              {/* column headers, wide screens only */}
              <div
                className="hidden items-center gap-3 border-b px-3 py-2 md:flex"
                style={{ borderColor: LINE, background: tint(0.05) }}
              >
                <span className="w-7 shrink-0" />
                <span className={`flex-1 ${LABEL}`}>Lesson</span>
                <span className={`hidden w-[68px] shrink-0 lg:block ${LABEL}`}>Level</span>
                <span className={`hidden w-[104px] shrink-0 sm:block ${LABEL}`}>Target</span>
                <span className={`w-[92px] shrink-0 text-right ${LABEL}`}>Personal best</span>
                <span className={`w-[58px] shrink-0 ${LABEL}`}>Stars</span>
                <span className="w-[14px] shrink-0" />
              </div>

              {rows.length > 0 ? (
                rows.map(lesson => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    isUnlocked={unlockedNodeIds.has(lesson.id)}
                    stars={nodeStars[lesson.id] || 0}
                    record={records[lesson.id]}
                    onSelect={onSelectNode}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                  <Search size={22} className="text-zinc-600" />
                  <p className="font-sans text-[13px] text-zinc-400">
                    No lessons match those filters.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-1 rounded-lg border px-3 py-1.5 font-sans text-[12px] font-medium text-zinc-200 transition-colors hover:text-white"
                    style={{ borderColor: LINE_STRONG }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pb-24" />
    </div>
  );
}
