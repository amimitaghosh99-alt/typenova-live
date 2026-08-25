import { useState, type CSSProperties } from 'react';
import {
  Activity, Award, ChevronLeft, Flame, Gauge, Lightbulb, LayoutGrid, RotateCcw,
  ShieldAlert, Sparkles, Star, Target, Trophy, Unlock, Volume2, VolumeX, X, Zap,
  ArrowBigUp,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { VirtualKeyboard } from './VirtualKeyboard';
import { CyberHands } from './CyberHands';
import { AcademySkillTree } from './AcademySkillTree';
import { AcademyPassage } from './AcademyPassage';
import { useAcademyEngine } from '@/hooks/useAcademyEngine';
import { CATEGORY_LABELS, getMasteryTitle } from '@/data/academyCurriculum';
import type { Theme } from '@/data/constants';
import {
  EASE_OUT, enter, fadeDown, listChild, listParent, milestonePop, popIn, ringPop, scaleIn,
  springHeavy, springSnappy, stageIn, toastIn,
} from './academyMotion';
import {
  DEFAULT_GLOW, glow, LABEL, LINE, LINE_STRONG, nodeLayoutId, PANEL, panelStyle, tint, TONE,
} from './academyTheme';
import { AnimatedNumber, MasteryIcon, Meter, StarRow } from './AcademyPrimitives';

/** Finger identity colours — these match keyboardMap and CyberHands, so they stay. */
const FINGER_META: Record<string, { dot: string; label: string }> = {
  'left-pinky': { dot: '#f43f5e', label: 'Left pinky' },
  'left-ring': { dot: '#f97316', label: 'Left ring' },
  'left-middle': { dot: '#eab308', label: 'Left middle' },
  'left-index': { dot: '#84cc16', label: 'Left index' },
  'thumb': { dot: '#f59e0b', label: 'Thumb' },
  'right-index': { dot: '#10b981', label: 'Right index' },
  'right-middle': { dot: '#06b6d4', label: 'Right middle' },
  'right-ring': { dot: '#3b82f6', label: 'Right ring' },
  'right-pinky': { dot: '#8b5cf6', label: 'Right pinky' },
};

/**
 * One-shot spark burst. Eight spans fly outward and fade, then the whole thing
 * unmounts, leaving nothing to composite. Reserved for moments rare enough to
 * afford the paint: combo milestones and the results trophy.
 */
function SparkBurst({ color, count = 8, radius = 46, size = 4 }: {
  color: string;
  count?: number;
  radius?: number;
  size?: number;
}) {
  return (
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-20">
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.75, ease: EASE_OUT }}
            style={{ width: size, height: size, background: color, boxShadow: `0 0 8px ${color}` }}
          />
        );
      })}
    </span>
  );
}

interface AcademyLayoutProps {
  /** Reserved for the host shell's exit affordance; the stage exits via its own header. */
  onExit?: () => void;
  theme?: Theme;
}

export function AcademyLayout({ theme }: AcademyLayoutProps) {
  const [viewMode, setViewMode] = useState<'skill-tree' | 'stage'>('skill-tree');
  const engine = useAcademyEngine(viewMode === 'stage');
  const reduce = !!useReducedMotion();

  const themeGlow = theme?.glowPrimary || DEFAULT_GLOW;
  const accent = `rgb(${themeGlow})`;

  const activeKey = engine.currentStep?.targetKey || '';
  const activeFinger = engine.currentStep?.finger || '';
  const instruction = engine.currentStep?.instruction || '';
  const fMeta = FINGER_META[activeFinger];

  const requiresShift = !!engine.currentStep?.requiresShift;
  const shiftFinger = engine.currentStep?.shiftFinger || '';
  const shiftMeta = FINGER_META[shiftFinger];

  const stepPercent = engine.totalSteps
    ? Math.min(100, Math.round((engine.currentStepIndex / engine.totalSteps) * 100))
    : 0;
  const showPassage = !engine.isDrillMode && engine.passage.length > 1;

  /** Every tenth clean keystroke is worth a flare; 6× shouldn't look like 50×. */
  const comboMilestone = engine.comboStreak >= 10 && engine.comboStreak % 10 === 0
    ? engine.comboStreak
    : 0;

  /** Live WPM at or past the lesson's target — the pill turns green and flares. */
  const hitTarget = !!engine.currentLesson && engine.wpm >= engine.currentLesson.targetWpm;

  const masteryTitle = getMasteryTitle(engine.academyLevel);
  const currentCategory = engine.currentLesson?.category || 'foundations';
  const catInfo = CATEGORY_LABELS[currentCategory];

  /** Drives the card → stage shared-element handoff. */
  const stageLayoutId = engine.currentLesson ? nodeLayoutId(engine.currentLesson.id) : undefined;

  const stateColor = engine.errorShake ? TONE.err : engine.isDrillMode ? TONE.boss : accent;
  const stateGlow = engine.errorShake
    ? 'rgba(248,113,113,0.35)'
    : engine.isDrillMode
      ? 'rgba(245,158,11,0.3)'
      : glow(themeGlow, 0.22);

  const handleSelectNode = (nodeId: string) => {
    engine.startLessonById(nodeId);
    setViewMode('stage');
  };


  return (
    <div
      className="relative z-10 flex w-full select-none flex-col bg-transparent"
      /*
        One variable feeds every neutral in the Academy — see academyTheme.
        Set here rather than globally so the tint follows the theme prop this
        subtree was given, including a wallpaper-derived one.
      */
      style={{ '--academy-tint': themeGlow } as CSSProperties}
    >
      {/*
        Reading scrim — deliberately light. Every piece of text in the Academy
        sits on one of the opaque SURFACE panels, so the scrim only has to settle
        the gutters between them; pushing it any darker just turned a sharp
        wallpaper into a grey haze, which is what read as "still blurred".

        It covers the whole viewport, and it's graded rather than flat. The top
        strip is the one place bare wallpaper meets the near-black panels head on
        — the nav's rounded bottom corners expose it, and the content column is
        inset from the viewport edges — so a flat 0.5 left a bright wedge in the
        top-left and top-right corners. The gradient lands heavier up there and
        eases off by the time it reaches the cards, where the wallpaper is free
        to show. Sitting at -z-10 inside the stage's z-20 layer keeps it well
        under the z-50 nav, so it dims the wallpaper behind the nav without
        touching the nav itself.
      */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: [
            `radial-gradient(120% 78% at 50% 0%, ${tint(0.08)}, transparent 64%)`,
            'linear-gradient(180deg,' +
            ' rgba(4, 6, 11, 0.88) 0px,' +
            ' rgba(4, 6, 11, 0.82) 120px,' +
            ' rgba(4, 6, 11, 0.6) 300px,' +
            ' rgba(4, 6, 11, 0.48) 520px,' +
            ' rgba(4, 6, 11, 0.48) 100%)',
          ].join(', '),
        }}
      />

      {/* ── Stage control bar ─────────────────────────────────────── */}
      <AnimatePresence>
        {viewMode === 'stage' && (
          <motion.header
            {...enter(reduce, fadeDown)}
            className={`relative z-20 mb-5 flex shrink-0 items-center justify-between gap-3 px-4 py-2.5 sm:px-6 ${PANEL}`}
            style={panelStyle('base')}
          >
            <div className="flex min-w-0 items-center gap-3">
              <motion.button
                onClick={() => setViewMode('skill-tree')}
                whileHover={reduce ? undefined : { x: -2 }}
                whileTap={reduce ? undefined : { scale: 0.96 }}
                transition={springSnappy}
                className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-sans text-[12px] font-medium text-zinc-300 transition-colors hover:text-white"
                style={{ borderColor: LINE, background: tint(0.07) }}
              >
                <ChevronLeft size={14} />
                Skill tree
              </motion.button>

              {engine.currentLesson && (
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      borderColor: `${catInfo.color}40`,
                      background: `${catInfo.color}15`,
                      color: catInfo.color,
                    }}
                  >
                    {catInfo.short}
                  </span>
                  <span className="hidden truncate font-sans text-[13px] font-semibold text-zinc-100 sm:inline-block">
                    {engine.lessonTitle}
                  </span>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span
                className="flex items-center gap-2 rounded-full border px-3 py-1"
                style={{ borderColor: LINE, background: tint(0.07) }}
              >
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <span className="font-mono text-[11px] font-bold tabular-nums text-zinc-100">
                  {engine.totalStars}
                </span>
                <span className="text-zinc-700">·</span>
                <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color: masteryTitle.color }}>
                  Lv {engine.academyLevel}
                </span>
              </span>

              <motion.button
                onClick={engine.toggleMute}
                whileTap={reduce ? undefined : { scale: 0.9 }}
                transition={springSnappy}
                title={engine.isMuted ? 'Unmute audio' : 'Mute audio'}
                aria-label={engine.isMuted ? 'Unmute audio' : 'Mute audio'}
                className="grid h-8 w-8 place-items-center rounded-xl border text-zinc-400 transition-colors hover:text-white"
                style={{
                  borderColor: engine.isMuted ? LINE : glow(themeGlow, 0.3),
                  background: engine.isMuted ? tint(0.07) : glow(themeGlow, 0.1),
                  color: engine.isMuted ? undefined : accent,
                }}
              >
                {engine.isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </motion.button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ── View switcher ─────────────────────────────────────────── */}
      {/*
        popLayout (rather than the old mode="wait") keeps both views mounted for
        the crossover, which is what lets the launched lesson card hand its
        geometry over to the practice stage instead of cross-fading.
      */}
      <div className="relative w-full bg-transparent">
        <AnimatePresence mode="popLayout" initial={false}>
          {viewMode === 'skill-tree' ? (
            <motion.div key="skill-tree-view" {...enter(reduce, scaleIn)} className="w-full">
              <AcademySkillTree
                mastery={engine.mastery}
                academyXp={engine.academyXp}
                totalStars={engine.totalStars}
                lessonsCleared={engine.lessonsCleared}
                nodeStars={engine.nodeStars}
                records={engine.records}
                dayStreak={engine.dayStreak}
                unlockedNodeIds={engine.unlockedNodeIds}
                onSelectNode={handleSelectNode}
                theme={theme}
              />
            </motion.div>
          ) : (
            <motion.div
              key="stage-view"
              {...enter(reduce, stageIn)}
              className="flex w-full flex-col items-center justify-center py-2"
            >
              {!engine.lessonComplete && (
                <div className="flex w-full max-w-2xl flex-col items-center">

                  {/* progress + live telemetry */}
                  <div className="mb-3 flex w-full items-center justify-between gap-3 px-1">
                    {engine.totalSteps <= 32 ? (
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: engine.totalSteps }).map((_, i) => {
                          const done = i < engine.currentStepIndex;
                          const current = i === engine.currentStepIndex;
                          const justDone = i === engine.currentStepIndex - 1;
                          return (
                            <span
                              key={i}
                              className="relative grid shrink-0 place-items-center"
                              style={{ width: 8, height: 8 }}
                            >
                              <motion.span
                                className="block rounded-full"
                                animate={
                                  current && !reduce
                                    ? { scale: [1, 1.22, 1] }
                                    : { scale: current ? 1 : 0.62 }
                                }
                                transition={
                                  current && !reduce
                                    ? { duration: 1.7, repeat: Infinity, ease: 'easeInOut' }
                                    : springSnappy
                                }
                                style={{
                                  width: 8,
                                  height: 8,
                                  background: done ? TONE.ok : current ? accent : tint(0.22),
                                  boxShadow: current ? `0 0 8px ${glow(themeGlow, 0.85)}` : 'none',
                                }}
                              />

                              {/* the dot that just cleared throws one ring, then unmounts */}
                              {justDone && !reduce && (
                                <motion.span
                                  aria-hidden
                                  {...enter(reduce, ringPop)}
                                  className="pointer-events-none absolute inset-0 rounded-full border"
                                  style={{ borderColor: TONE.ok }}
                                />
                              )}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex min-w-0 items-center gap-2">
                        <Meter
                          percent={stepPercent}
                          color={accent}
                          glowColor={glow(themeGlow, 0.7)}
                          height={6}
                          className="w-28 sm:w-44"
                        />
                        <span className="shrink-0 font-mono text-[10px] font-bold tabular-nums text-zinc-500">
                          {engine.currentStepIndex}/{engine.totalSteps}
                        </span>
                      </div>
                    )}

                    <div className="flex shrink-0 items-center gap-2">
                      <AnimatePresence>
                        {engine.comboStreak >= 5 && (
                          <motion.div
                            {...enter(reduce, popIn)}
                            className="relative hidden items-center gap-1.5 rounded-full border px-3 py-1 sm:flex"
                            style={{ borderColor: `${TONE.boss}55`, background: `${TONE.boss}18` }}
                          >
                            {/* milestone flare + sparks, keyed so each 10× replays it */}
                            {comboMilestone > 0 && !reduce && (
                              <motion.span
                                key={comboMilestone}
                                aria-hidden
                                {...enter(reduce, milestonePop)}
                                className="pointer-events-none absolute inset-0 rounded-full"
                                style={{ background: `radial-gradient(circle, ${TONE.boss}77, transparent 70%)` }}
                              >
                                <SparkBurst color={TONE.boss} count={6} radius={34} size={3} />
                              </motion.span>
                            )}

                            <Flame size={12} style={{ color: TONE.boss }} />
                            {/* keyed so each increment re-fires the rubber-band */}
                            <motion.span
                              key={engine.comboStreak}
                              initial={reduce ? false : { scale: 1.4 }}
                              animate={{ scale: 1 }}
                              transition={springSnappy}
                              className="font-mono text-[11px] font-bold tabular-nums"
                              style={{ color: TONE.boss }}
                            >
                              {engine.comboStreak}×
                            </motion.span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Live readouts spring between values now — they used to
                          snap between integers, which read as a static label. */}
                      <span
                        className="relative flex items-center gap-1.5 rounded-full border px-3 py-1"
                        style={{
                          borderColor: hitTarget ? `${TONE.ok}66` : LINE,
                          background: panelStyle('sunken').background,
                          transition: 'border-color 240ms ease-out',
                        }}
                      >
                        {/* one flare when the lesson's target speed is reached */}
                        {hitTarget && !reduce && (
                          <motion.span
                            aria-hidden
                            {...enter(reduce, milestonePop)}
                            className="pointer-events-none absolute inset-0 rounded-full"
                            style={{ background: `radial-gradient(circle, ${TONE.ok}55, transparent 70%)` }}
                          />
                        )}
                        <Gauge size={12} style={{ color: hitTarget ? TONE.ok : accent }} />
                        <span className={LABEL}>wpm</span>
                        <span
                          className="relative font-mono text-[12px] font-bold tabular-nums"
                          style={{ color: hitTarget ? TONE.ok : accent, transition: 'color 240ms ease-out' }}
                        >
                          <AnimatedNumber value={engine.wpm} />
                        </span>
                      </span>

                      <span
                        className="flex items-center gap-1.5 rounded-full border px-3 py-1"
                        style={{ borderColor: LINE, background: panelStyle('sunken').background }}
                      >
                        <Activity size={12} style={{ color: TONE.ok }} />
                        <span className={LABEL}>acc</span>
                        <span className="font-mono text-[12px] font-bold tabular-nums" style={{ color: TONE.ok }}>
                          <AnimatedNumber value={engine.accuracy} />%
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* passage rail */}
                  {showPassage && (
                    <AcademyPassage
                      passage={engine.passage}
                      index={engine.currentStepIndex}
                      errorShake={engine.errorShake}
                      themeGlow={themeGlow}
                      lastKeystroke={engine.lastKeystroke}
                    />
                  )}

                  {/* adaptive drill banner */}
                  <AnimatePresence>
                    {engine.isDrillMode && (
                      <motion.div
                        {...enter(reduce, fadeDown)}
                        className="relative mb-3 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border px-4 py-2"
                        style={{ borderColor: `${TONE.boss}50`, background: `${TONE.boss}14` }}
                      >
                        {/* a slow scan across the banner — "lock in this key" should feel urgent */}
                        {!reduce && (
                          <motion.span
                            aria-hidden
                            className="pointer-events-none absolute inset-y-0 w-1/4 -skew-x-12"
                            initial={{ x: '-150%' }}
                            animate={{ x: '520%' }}
                            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.6 }}
                            style={{ background: `linear-gradient(90deg, transparent, ${TONE.boss}33, transparent)` }}
                          />
                        )}
                        <Target size={13} className="relative" style={{ color: TONE.boss }} />
                        <span className="relative font-sans text-[12px] font-medium" style={{ color: TONE.boss }}>
                          Micro-drill — lock in this key
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── Instruction card: the stage's single focal surface ──
                      No backdrop-blur on it: the card animates its geometry during
                      the shared-element handoff, and a backdrop filter would force a
                      re-blur on every frame of that spring for no visible gain at
                      the raised surface's 0.96 alpha. */}
                  <motion.div
                    layoutId={stageLayoutId}
                    transition={springHeavy}
                    className={`relative mb-3 w-full overflow-hidden rounded-2xl border
                      ${engine.errorShake ? 'animate-[shake_0.3s_ease-in-out]' : ''}`}
                    style={{
                      background: panelStyle('raised').background,
                      borderColor: engine.errorShake
                        ? 'rgba(248,113,113,0.6)'
                        : engine.isDrillMode
                          ? `${TONE.boss}99`
                          : glow(themeGlow, 0.35),
                      boxShadow: `0 8px 28px rgba(0,0,0,0.5), 0 0 22px ${stateGlow}`,
                      transition: 'border-color 200ms ease-out, box-shadow 200ms ease-out',
                    }}
                  >
                    {/* Each cleared key sends a wash across the focal surface, so
                        forward progress is felt where the learner is looking. */}
                    {!reduce && engine.currentStepIndex > 0 && (
                      <motion.span
                        key={engine.currentStepIndex}
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12"
                        initial={{ x: '-130%', opacity: 0.8 }}
                        animate={{ x: '360%', opacity: 0 }}
                        transition={{ duration: 0.5, ease: EASE_OUT }}
                        style={{ background: `linear-gradient(90deg, transparent, ${glow(themeGlow, 0.18)}, transparent)` }}
                      />
                    )}

                    {/* Error flash — opacity on a pre-painted wash rather than an
                        animated shadow, which would repaint the whole card. */}
                    <AnimatePresence>
                      {engine.errorShake && !reduce && (
                        <motion.span
                          aria-hidden
                          className="pointer-events-none absolute inset-0"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.12, ease: EASE_OUT }}
                          style={{ background: 'radial-gradient(circle at 50% 50%, rgba(248,113,113,0.3), transparent 75%)' }}
                        />
                      )}
                    </AnimatePresence>

                    <div className="relative z-10 flex flex-col items-center gap-2 px-6 py-4">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {fMeta && (
                          <motion.span
                            key={activeFinger}
                            initial={reduce ? false : { opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={springSnappy}
                            className="flex items-center gap-1.5 rounded-full border px-3 py-0.5"
                            style={{ borderColor: `${fMeta.dot}55`, background: `${fMeta.dot}18` }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ background: fMeta.dot, boxShadow: `0 0 6px ${fMeta.dot}` }}
                            />
                            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-200">
                              {fMeta.label}
                            </span>
                          </motion.span>
                        )}

                        <AnimatePresence>
                          {requiresShift && (
                            <motion.span
                              {...enter(reduce, popIn)}
                              className="flex items-center gap-1.5 rounded-full border px-3 py-0.5"
                              style={{
                                borderColor: shiftMeta ? `${shiftMeta.dot}66` : 'rgba(34,211,238,0.4)',
                                background: shiftMeta ? `${shiftMeta.dot}1f` : 'rgba(34,211,238,0.12)',
                              }}
                            >
                              <ArrowBigUp size={12} style={{ color: shiftMeta?.dot || '#67e8f9' }} />
                              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-100">
                                Shift · {shiftMeta?.label || 'opposite pinky'}
                              </span>
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      <motion.h2
                        key={instruction}
                        initial={reduce ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={springSnappy}
                        className="text-center font-sans text-lg font-semibold tracking-tight md:text-xl"
                        style={{ color: engine.errorShake ? '#fca5a5' : engine.isDrillMode ? '#fbbf24' : '#ffffff' }}
                      >
                        {instruction || 'Press the highlighted key'}
                      </motion.h2>

                      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                        {engine.currentLesson?.tip && (
                          <span className="flex items-center gap-1.5 text-center font-sans text-[12px] text-zinc-400">
                            <Lightbulb size={11} className="shrink-0 text-amber-400" />
                            {engine.currentLesson.tip}
                          </span>
                        )}
                        {engine.currentRecord && engine.currentRecord.bestWpm > 0 && (
                          <span className="flex items-center gap-1.5 font-mono text-[10px] tabular-nums text-zinc-500">
                            <Award size={11} className="shrink-0" />
                            PB {engine.currentRecord.bestWpm} wpm · {engine.currentRecord.bestAccuracy}%
                            {engine.currentLesson && ` · target ${engine.currentLesson.targetWpm}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* state edge — colour carries the meaning, so the border needn't shout */}
                    <motion.span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-[2px] origin-left"
                      animate={{ backgroundColor: stateColor }}
                      transition={{ duration: 0.2 }}
                    />
                  </motion.div>

                  {/* keyboard + hands */}
                  <div className="flex w-full max-w-2xl flex-col items-center gap-2">
                    <VirtualKeyboard
                      activeKey={activeKey}
                      activeFinger={activeFinger}
                      keyErrorHeatmap={engine.keyErrorHeatmap}
                      lastKeystroke={engine.lastKeystroke}
                      requiresShift={requiresShift}
                      shiftFinger={shiftFinger}
                      capsLockOn={engine.capsLockOn}
                      theme={theme}
                    />
                    <CyberHands activeKey={activeKey} activeFinger={activeFinger} />
                  </div>
                </div>
              )}

              {/* ── Results ─────────────────────────────────────────── */}
              {engine.lessonComplete && (
                <motion.div
                  {...enter(reduce, scaleIn)}
                  transition={springHeavy}
                  className={`relative flex w-full max-w-md flex-col items-center gap-5 overflow-hidden p-6 text-center sm:p-8 ${PANEL}`}
                  style={{ ...panelStyle('raised', true), boxShadow: '0 20px 60px rgba(0,0,0,0.55)' }}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full blur-3xl"
                    style={{
                      background: engine.isBossFailed ? 'rgba(239,68,68,0.14)' : glow(themeGlow, 0.14),
                    }}
                  />

                  <motion.div {...enter(reduce, popIn)} className="relative grid h-16 w-16 place-items-center">
                    {/* the payoff moment — one burst, then nothing lingers */}
                    {!engine.isBossFailed && !reduce && <SparkBurst color={TONE.star} radius={54} />}
                    {engine.isBossFailed ? (
                      <ShieldAlert size={44} style={{ color: TONE.err }} />
                    ) : (
                      <Trophy size={44} style={{ color: TONE.star }} />
                    )}
                  </motion.div>

                  <div>
                    <h2 className="font-sans text-xl font-bold tracking-tight text-white sm:text-2xl">
                      {engine.isBossFailed ? 'Not quite' : 'Lesson complete'}
                    </h2>
                    <p className="mt-1 font-sans text-[13px] text-zinc-400">
                      {engine.isBossFailed
                        ? 'Missed the boss target — tighten accuracy and retry.'
                        : engine.lessonTitle}
                    </p>
                  </div>

                  {!engine.isBossFailed && (
                    <StarRow stars={engine.starsEarned} size={30} animate={!reduce} />
                  )}

                  <motion.div
                    {...(reduce ? {} : { variants: listParent(0.08, 0.25), initial: 'hidden', animate: 'show' })}
                    className="flex flex-wrap items-center justify-center gap-2"
                  >
                    {!engine.isBossFailed && engine.xpGainedThisLesson > 0 && (
                      <motion.span
                        {...(reduce ? {} : { variants: listChild })}
                        className="flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[12px] font-bold"
                        style={{ borderColor: `${TONE.star}55`, background: `${TONE.star}16`, color: TONE.star }}
                      >
                        <Zap size={13} />
                        +<AnimatedNumber value={engine.xpGainedThisLesson} /> XP
                      </motion.span>
                    )}

                    {engine.isNewRecord && (
                      <motion.span
                        {...(reduce ? {} : { variants: listChild })}
                        className="flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-sans text-[12px] font-semibold"
                        style={{ borderColor: `${TONE.ok}55`, background: `${TONE.ok}16`, color: TONE.ok }}
                      >
                        <Award size={13} />
                        Personal best
                      </motion.span>
                    )}
                  </motion.div>

                  {/* telemetry */}
                  <motion.div
                    {...(reduce ? {} : { variants: listParent(0.06, 0.15), initial: 'hidden', animate: 'show' })}
                    className="grid w-full grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-4"
                    style={{ borderColor: LINE, background: LINE }}
                  >
                    {[
                      { label: 'Speed', value: engine.wpm, unit: 'wpm' },
                      { label: 'Accuracy', value: engine.accuracy, unit: '%' },
                      { label: 'Mistakes', value: engine.mistakes, unit: 'errors' },
                      { label: 'Best combo', value: engine.bestCombo, unit: 'clean' },
                    ].map(cell => (
                      <motion.div
                        key={cell.label}
                        {...(reduce ? {} : { variants: listChild })}
                        className="flex flex-col items-center py-3"
                        style={{ background: panelStyle('raised').background }}
                      >
                        <span className={LABEL}>{cell.label}</span>
                        <span className="mt-0.5 font-mono text-lg font-bold tabular-nums text-white">
                          <AnimatedNumber value={cell.value} />
                        </span>
                        <span className="font-mono text-[9px] text-zinc-600">{cell.unit}</span>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* actions */}
                  <div className="mt-1 flex w-full flex-col items-center justify-center gap-2.5 sm:flex-row">
                    <motion.button
                      onClick={engine.retryLesson}
                      whileHover={reduce ? undefined : { y: -2 }}
                      whileTap={reduce ? undefined : { scale: 0.97 }}
                      transition={springSnappy}
                      className="flex w-full flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 font-sans text-[13px] font-semibold text-zinc-200 transition-colors hover:text-white sm:w-auto"
                      style={{ borderColor: LINE_STRONG, background: tint(0.08) }}
                    >
                      <RotateCcw size={14} />
                      Retry
                    </motion.button>

                    {!engine.isBossFailed && (
                      <motion.button
                        onClick={engine.nextLesson}
                        whileHover={reduce ? undefined : { y: -2 }}
                        whileTap={reduce ? undefined : { scale: 0.97 }}
                        transition={springSnappy}
                        className="flex w-full flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 font-sans text-[13px] font-semibold text-white sm:w-auto"
                        style={{
                          borderColor: glow(themeGlow, 0.7),
                          background: glow(themeGlow, 0.28),
                          boxShadow: `0 0 20px ${glow(themeGlow, 0.3)}`,
                        }}
                      >
                        <Zap size={14} />
                        Next lesson
                      </motion.button>
                    )}

                    <motion.button
                      onClick={() => setViewMode('skill-tree')}
                      whileHover={reduce ? undefined : { y: -2 }}
                      whileTap={reduce ? undefined : { scale: 0.97 }}
                      transition={springSnappy}
                      className="flex w-full flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 font-sans text-[13px] font-semibold sm:w-auto"
                      style={{ borderColor: LINE_STRONG, background: tint(0.08), color: accent }}
                    >
                      <LayoutGrid size={14} />
                      Skill tree
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── One toast stack, bottom-right ─────────────────────────── */}
      {/* Coaching, level-ups and unlocks used to fire at three different
          screen corners; they now share an anchor and push each other. */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-[290px] flex-col items-stretch gap-2">
        <AnimatePresence initial={false}>
          {engine.shiftCoach && (
            <motion.div
              key={`shift-${engine.shiftCoach.key}-${engine.shiftCoach.usedHand}`}
              layout={!reduce}
              {...enter(reduce, toastIn)}
              className={`pointer-events-auto flex items-start gap-2.5 p-3 ${PANEL}`}
              style={{ ...panelStyle('raised'), borderColor: `${TONE.boss}55` }}
            >
              <ArrowBigUp size={15} className="mt-0.5 shrink-0" style={{ color: TONE.boss }} />
              <span className="font-sans text-[12px] leading-snug text-zinc-200">
                Use the <span className="font-semibold" style={{ color: TONE.boss }}>{engine.shiftCoach.expectedHand}</span> Shift
                for <span className="font-mono font-bold text-white">“{engine.shiftCoach.key}”</span> — opposite hand from the letter.
              </span>
            </motion.div>
          )}

          {engine.levelUpEvent && (
            <motion.div
              key={`levelup-${engine.levelUpEvent.level}`}
              layout={!reduce}
              {...enter(reduce, toastIn)}
              className={`pointer-events-auto flex items-center gap-3 p-3 ${PANEL}`}
              style={{
                ...panelStyle('raised'),
                borderColor: `${engine.levelUpEvent.color}77`,
                boxShadow: `0 12px 36px rgba(0,0,0,0.5), 0 0 22px ${engine.levelUpEvent.color}33`,
              }}
            >
              <motion.span
                {...enter(reduce, popIn)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border"
                style={{
                  borderColor: `${engine.levelUpEvent.color}66`,
                  background: `${engine.levelUpEvent.color}1f`,
                  color: engine.levelUpEvent.color,
                }}
              >
                <MasteryIcon level={engine.levelUpEvent.level} size={20} />
              </motion.span>
              <span className="min-w-0 flex-1">
                <span
                  className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: engine.levelUpEvent.color }}
                >
                  <Sparkles size={11} /> Level {engine.levelUpEvent.level}
                </span>
                <span className="block truncate font-sans text-[13px] font-semibold text-white">
                  {engine.levelUpEvent.title}
                </span>
              </span>
              <button
                onClick={engine.dismissLevelUp}
                aria-label="Dismiss level up"
                className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={13} />
              </button>
            </motion.div>
          )}

          {engine.newlyUnlocked.length > 0 && (
            <motion.div
              key="unlocks"
              layout={!reduce}
              {...enter(reduce, toastIn)}
              className={`pointer-events-auto p-3 ${PANEL}`}
              style={{ ...panelStyle('raised'), borderColor: `${TONE.ok}55` }}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: TONE.ok }}
                >
                  <Unlock size={11} /> {engine.newlyUnlocked.length} unlocked
                </span>
                <button
                  onClick={engine.dismissUnlocks}
                  aria-label="Dismiss unlocks"
                  className="-mr-1 -mt-1 rounded-lg p-1 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X size={13} />
                </button>
              </div>
              <motion.ul
                {...(reduce ? {} : { variants: listParent(0.05, 0.1), initial: 'hidden', animate: 'show' })}
                className="mt-1.5 space-y-1"
              >
                {engine.newlyUnlocked.slice(0, 4).map(lesson => (
                  <motion.li
                    key={lesson.id}
                    {...(reduce ? {} : { variants: listChild })}
                    className="truncate font-sans text-[12px] text-zinc-300"
                  >
                    {lesson.title}
                  </motion.li>
                ))}
                {engine.newlyUnlocked.length > 4 && (
                  <li className="font-sans text-[11px] text-zinc-500">
                    +{engine.newlyUnlocked.length - 4} more
                  </li>
                )}
              </motion.ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
