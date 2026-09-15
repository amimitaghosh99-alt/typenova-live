import { useEffect, useRef } from 'react';
import type { Theme } from '@/data/constants';
import type { ModalState } from '@/lib/layout';
import type { useTypingEngine } from '@/hooks/useTypingEngine';
import type { useAudioEngine } from '@/hooks/useAudioEngine';
import type { useRPGSystem } from '@/hooks/useRPGSystem';
import type { useParticles } from '@/hooks/useParticles';
import type { GameConfigState } from '@/hooks/useGameConfig';
import type { useGameConfig } from '@/hooks/useGameConfig';
import { applyCapitalsCurse, type ActiveHex } from '@/lib/sabotageEngine';

interface TypingControllerProps {
  typing: ReturnType<typeof useTypingEngine>;
  audio: ReturnType<typeof useAudioEngine>;
  rpg: ReturnType<typeof useRPGSystem>;
  particles: ReturnType<typeof useParticles>;
  gameConfig: GameConfigState;
  gameActions: ReturnType<typeof useGameConfig>;
  activeHexes?: ActiveHex[];

  /**
   * Any open dialog swallows keystrokes. Typed against the shared union so a
   * modal key that no longer exists can't be passed in — a `'race'` value that
   * rendered nothing used to make this component eat every key with no visible
   * dialog to close.
   */
  activeModal: ModalState;
  /**
   * A full-page route that owns the keyboard (the operator dossier). Dialogs are
   * covered by `activeModal`, but a page is not in that union — and this
   * controller is mounted app-wide, so without this every keystroke on the
   * dossier still drove the typing test underneath it.
   */
  keyboardBlocked?: boolean;
  raceActive: boolean;
  theme: Theme;
  tetrisEffect: boolean;

  onUnlockGodMode: () => void;
  onReset: () => void;
  onExitMicroDrill: () => void;
  onChargeHexEnergy?: (opts: { combo: number; isError?: boolean; isMilestone?: boolean }) => void;
}

export function TypingController({
  typing,
  audio,
  rpg,
  particles,
  gameConfig,
  gameActions,
  activeModal,
  keyboardBlocked = false,
  raceActive,
  theme,
  tetrisEffect,
  onUnlockGodMode,
  onReset,
  onExitMicroDrill,
  onChargeHexEnergy,
  activeHexes,
}: TypingControllerProps) {

  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMilestoneRef = useRef(0);

  // Use a ref to store the latest props so the keydown listener doesn't need to re-bind
  // and trigger GC thrashing on every keystroke.
  const stateRef = useRef({
    typing, audio, rpg, particles, gameConfig, gameActions,
    activeModal, keyboardBlocked, raceActive, theme, tetrisEffect,
    onUnlockGodMode, onReset, onExitMicroDrill, onChargeHexEnergy, activeHexes
  });

  useEffect(() => {
    Object.assign(stateRef.current, {
      typing, audio, rpg, particles, gameConfig, gameActions,
      activeModal, keyboardBlocked, raceActive, theme, tetrisEffect,
      onUnlockGodMode, onReset, onExitMicroDrill, onChargeHexEnergy, activeHexes
    });
  });

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      const {
        typing, audio, rpg, particles, gameConfig, gameActions,
        activeModal, keyboardBlocked, raceActive, theme, tetrisEffect,
        onUnlockGodMode, onReset, onExitMicroDrill, onChargeHexEnergy
      } = s;

      const cfg = gameConfig;

      // Modal escape handling is now ONLY for typing flow interruptions here.
      // Global modal closing (Escape to close settings) should ideally be handled by App.tsx,
      // but we ignore keystrokes if a modal is open.
      if (activeModal) return;
      // Same for a route that owns the keyboard, e.g. the operator dossier —
      // it has its own Escape and arrow-key handling.
      if (keyboardBlocked) return;

      // Any focused text field owns the keyboard — the floating Aru chat widget
      // is not part of the activeModal machine, so without this the phase
      // branches below would still see every keystroke typed into its input.
      // [data-keyboard-isolated] covers the rest of such a widget, so tabbing to
      // one of its buttons and pressing Escape doesn't also reset the test.
      const focused = document.activeElement as HTMLElement | null;
      if (
        focused &&
        (focused.tagName === 'INPUT' ||
          focused.tagName === 'TEXTAREA' ||
          focused.isContentEditable ||
          focused.closest('[data-keyboard-isolated]'))
      ) {
        return;
      }

      let currentPhase = typing.phase;

      // Guard against post-mortem keystrokes executing after test finish
      if (typing.isFinishingRef.current && (currentPhase === 'TYPING' || currentPhase === 'FINISHED')) return;
      if (currentPhase === 'CONFIGURING' || currentPhase === 'READY') {
        typing.isFinishingRef.current = false;
      }

      // During an active multiplayer race, swallow ESC so a mid-race abort
      // can't desync the room; typing still flows through below.
      if (raceActive && e.key === 'Escape') { e.preventDefault(); return; }

      // Caps lock detection
      if (e.getModifierState && e.getModifierState('CapsLock')) typing.setCapsLock(true);
      else typing.setCapsLock(false);

      // ─── CONFIGURING ───
      if (currentPhase === 'CONFIGURING') {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) {
            gameActions.setZenMode(true);
          }
          typing.setPhase('COUNTDOWN');
          typing.setCountdownTimer(3);
          lastMilestoneRef.current = 0;
          return;
        }

        if (e.key === ' ') {
          const firstChar = typing.targetText[0];
          if (firstChar !== ' ') {
            e.preventDefault();
            typing.setPhase('COUNTDOWN');
            typing.setCountdownTimer(3);
            typing.setInputSync('');
            lastMilestoneRef.current = 0;
            return;
          }
        }

        if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
          const currentInput = typing.inputRef.current;
          const nextInput = (currentInput + e.key).toLowerCase();

          if (import.meta.env.DEV && 'godmode'.startsWith(nextInput)) {
            typing.setInputSync(nextInput);
            if (nextInput === 'godmode') {
              onUnlockGodMode();
              typing.setInputSync('');
            }
            return;
          } else if (currentInput.length > 0) {
            typing.setInputSync('');
          }

          // Transition seamlessly from CONFIGURING to active TYPING on first keystroke
          typing.setPhase('TYPING');
          typing.setStartTime(Date.now());
          lastMilestoneRef.current = 0;
          currentPhase = 'TYPING';
        } else {
          return;
        }
      }

      // ─── READY ───
      if (currentPhase === 'READY') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (e.shiftKey) {
            gameActions.setZenMode(true);
          }
          typing.setPhase('COUNTDOWN');
          typing.setCountdownTimer(3);
          lastMilestoneRef.current = 0;
          return;
        } else if (e.key === 'Escape') {
          typing.setPhase('CONFIGURING');
          lastMilestoneRef.current = 0;
          return;
        } else if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
          // Transition seamlessly from READY to active TYPING on first keystroke
          typing.setPhase('TYPING');
          typing.setStartTime(Date.now());
          lastMilestoneRef.current = 0;
          currentPhase = 'TYPING';
        } else {
          return;
        }
      }

      // ─── COUNTDOWN / TYPING / FINISHED ───
      if (currentPhase === 'COUNTDOWN' || currentPhase === 'TYPING' || currentPhase === 'FINISHED') {
        if (e.key === 'Escape') {
          lastMilestoneRef.current = 0;
          if (cfg.microDrillActive) { onExitMicroDrill(); }
          else { onReset(); }
          return;
        }
      }

      // ─── TYPING ONLY ───
      if (currentPhase !== 'TYPING') return;
      if (e.ctrlKey || e.metaKey || e.altKey || (e.key.length > 1 && e.key !== 'Enter' && e.key !== 'Backspace')) return;
      if (e.key === 'Shift') return;

      // Backspace
      if (e.key === 'Backspace') {
        if (raceActive) {
          e.preventDefault();
          return;
        }

        const currentInput = typing.inputRef.current;
        if (currentInput.length === 0) {
          e.preventDefault();
          return;
        }

        if (currentInput.length > 0) {
          if (cfg.stickyKeysMode && cfg.stickyPenalty > 0) {
            gameActions.setStickyPenalty((p: number) => Math.max(0, p - 1));
            audio.playSound('error');
            return;
          }
          typing.setInputSync((prev: string) => prev.slice(0, -1));
          typing.keystrokeLog.current.push({ key: 'Backspace', expected: '', time: Date.now(), isError: false, isBackspace: true });
          audio.playSound('click');
          typing.setCombo(0);
          typing.comboRef.current = 0;
          lastMilestoneRef.current = 0;
          onChargeHexEnergy?.({ combo: 0, isError: true });
        }
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') e.preventDefault();

      const currentInput = typing.inputRef.current;
      if (currentInput.length < typing.targetText.length) {
        const now = Date.now();
        let typedChar = e.key;
        if (typedChar === 'Enter') typedChar = '\n';

        const hasCapitalsCurse = Boolean(stateRef.current.activeHexes?.some(h => h.hexType === 'capitals_curse'));
        const effectiveTarget = hasCapitalsCurse
          ? applyCapitalsCurse(typing.targetText, currentInput.length, 4)
          : typing.targetText;
        const expectedChar = effectiveTarget[currentInput.length];
        const isError = typedChar !== expectedChar;
        const nextInput = currentInput + typedChar;

        typing.setInputSync((prev: string) => prev + typedChar);
        typing.keystrokeLog.current.push({ key: typedChar, expected: expectedChar, time: now, isError });

        if (isError) {
          audio.playSound('error');
          typing.setCombo(0);
          typing.comboRef.current = 0;
          lastMilestoneRef.current = 0;
          onChargeHexEnergy?.({ combo: 0, isError: true });
          if (shakeTimeoutRef.current) {
            clearTimeout(shakeTimeoutRef.current);
          }
          typing.setShake(true);
          shakeTimeoutRef.current = setTimeout(() => {
            typing.setShake(false);
            shakeTimeoutRef.current = null;
          }, 200);
          if (cfg.stickyKeysMode) gameActions.setStickyPenalty(3);
          if (cfg.suddenDeath) {
            typing.finishTest(now, nextInput);
            return;
          }
        } else {
          const nextCombo = typing.comboRef.current + 1;
          typing.comboRef.current = nextCombo;
          typing.setCombo(nextCombo);
          typing.setMaxCombo((prev: number) => Math.max(prev, nextCombo));
          audio.playSound('key');

          // Trigger procedural milestone chime when crossing 50, 100, 150, 200 combo thresholds
          const currentMilestone = Math.floor(nextCombo / 50) * 50;
          const isMilestone = (nextCombo === 25 || nextCombo === 50 || nextCombo === 100 || nextCombo === 200);
          onChargeHexEnergy?.({ combo: nextCombo, isMilestone });

          if (currentMilestone >= 50 && currentMilestone > lastMilestoneRef.current) {
            lastMilestoneRef.current = currentMilestone;
            audio.playSound('combo_milestone', currentMilestone);
          }

          if (tetrisEffect || nextCombo >= 50) {
            particles.spawnParticles(
              currentInput.length,
              expectedChar,
              theme.text,
              Math.floor(Math.random() * 3) + 2
            );
          }
        }

        if (nextInput.length === typing.targetText.length) {
          typing.finishTest(now, nextInput);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null; // This is a logic-only component
}
