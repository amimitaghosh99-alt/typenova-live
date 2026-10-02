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
import { toast } from 'sonner';

/**
 * Normalizes user keystrokes against target characters, matching standard ASCII inputs
 * against typographical unicode punctuation (em/en dashes, curly quotes, non-breaking spaces).
 */
export function isCharacterMatch(typed: string, expected: string): boolean {
  if (typed === expected) return true;
  // Unicode em-dash (—) and en-dash (–) match standard hyphen (-)
  if (typed === '-' && (expected === '—' || expected === '–')) return true;
  // Typographic curly quotes match standard single/double quotes
  if (typed === "'" && (expected === '’' || expected === '‘')) return true;
  if (typed === '"' && (expected === '”' || expected === '“')) return true;
  // Non-breaking & figure spaces match standard space
  if (typed === ' ' && (expected === '\u00A0' || expected === '\u202F' || expected === '\u2007')) return true;
  return false;
}

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
  const restartArmedRef = useRef(0);
  const cheatBufferRef = useRef('');
  const cheatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (cheatTimerRef.current) {
        clearTimeout(cheatTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      const {
        typing, audio, particles, gameConfig, gameActions,
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

      // During an active multiplayer race, swallow ESC/TAB so a mid-race abort
      // can't desync the room or shift focus; typing still flows through below.
      if (raceActive && (e.key === 'Escape' || e.key === 'Tab')) { e.preventDefault(); return; }

      // Caps lock detection
      if (e.getModifierState && e.getModifierState('CapsLock')) typing.setCapsLock(true);
      else typing.setCapsLock(false);

      // Direct God Mode hotkeys: Ctrl+Shift+G / Cmd+Shift+G or ` / ~ outside active typing
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'G' || e.key === 'g')) {
        e.preventDefault();
        onUnlockGodMode();
        return;
      }
      if ((currentPhase === 'CONFIGURING' || currentPhase === 'READY') && (e.key === '`' || e.key === '~')) {
        e.preventDefault();
        onUnlockGodMode();
        return;
      }

      // ─── CONFIGURING ───
      if (currentPhase === 'CONFIGURING') {
        if (e.key === 'Tab') {
          e.preventDefault();
          onReset();
          return;
        }

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
          // Rolling buffer for godmode easter egg
          if (cheatTimerRef.current) clearTimeout(cheatTimerRef.current);
          cheatTimerRef.current = setTimeout(() => {
            cheatBufferRef.current = '';
          }, 3000);

          const nextCheat = (cheatBufferRef.current + e.key.toLowerCase()).slice(-10);
          cheatBufferRef.current = nextCheat;

          if (nextCheat.endsWith('godmode')) {
            cheatBufferRef.current = '';
            onUnlockGodMode();
            return;
          }

          // If user is currently typing "godmode", do not start the typing test
          if ('godmode'.startsWith(nextCheat)) {
            return;
          }

          // Otherwise, clear cheat buffer and transition seamlessly from CONFIGURING to active TYPING
          cheatBufferRef.current = '';
          if (typing.inputRef.current.length > 0) {
            typing.setInputSync('');
          }
          typing.setPhase('TYPING');
          typing.setStartTime(Date.now());
          lastMilestoneRef.current = 0;
          currentPhase = 'TYPING';
        } else if (e.key === 'Backspace' && cheatBufferRef.current.length > 0) {
          cheatBufferRef.current = cheatBufferRef.current.slice(0, -1);
          return;
        } else {
          return;
        }
      }

      // ─── READY ───
      if (currentPhase === 'READY') {
        if (e.key === 'Tab') {
          e.preventDefault();
          onReset();
          return;
        }

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
          e.preventDefault();
          restartArmedRef.current = 0;
          toast.dismiss('quick-restart-arm');
          lastMilestoneRef.current = 0;
          if (cfg.microDrillActive) { onExitMicroDrill(); }
          else { onReset(); }
          return;
        }

        // Tab + Enter / Tab + Tab quick restart ergonomics
        if (e.key === 'Tab') {
          e.preventDefault();
          // In CODE mode with active typing, Tab should advance spaces instead of restarting
          if (cfg.level === 'CODE' && typing.inputRef.current.length > 0) {
            const curInput = typing.inputRef.current;
            if (curInput.length < typing.targetText.length && typing.targetText[curInput.length] === ' ') {
              let count = 0;
              let idx = curInput.length;
              while (idx < typing.targetText.length && typing.targetText[idx] === ' ' && count < 2) {
                count++;
                idx++;
              }
              if (count > 0) {
                const spaces = ' '.repeat(count);
                const nextInput = curInput + spaces;
                const now = Date.now();
                typing.setInputSync((prev: string) => prev + spaces);
                for (let s = 0; s < count; s++) {
                  typing.keystrokeLog.current.push({ key: ' ', expected: ' ', time: now, isError: false });
                }
                audio.playSound('key');
                if (nextInput.length >= typing.targetText.length) {
                  typing.finishTest(now, nextInput);
                }
                return;
              }
            }
            return;
          }

          const now = Date.now();
          if (now - restartArmedRef.current < 1500) {
            restartArmedRef.current = 0;
            toast.dismiss('quick-restart-arm');
            lastMilestoneRef.current = 0;
            if (cfg.microDrillActive) { onExitMicroDrill(); }
            else { onReset(); }
            return;
          }
          restartArmedRef.current = now;
          toast.info('Press ENTER or TAB again to restart', { duration: 1500, id: 'quick-restart-arm' });
          return;
        }

        if (e.key === 'Enter' && Date.now() - restartArmedRef.current < 1500) {
          e.preventDefault();
          restartArmedRef.current = 0;
          toast.dismiss('quick-restart-arm');
          lastMilestoneRef.current = 0;
          if (cfg.microDrillActive) { onExitMicroDrill(); }
          else { onReset(); }
          return;
        }
      }

      // ─── TYPING ONLY ───
      if (currentPhase !== 'TYPING') return;

      // Typing any non-restart key disarms the quick-restart confirmation so accidental tabs never disrupt flow
      if (restartArmedRef.current > 0) {
        restartArmedRef.current = 0;
        toast.dismiss('quick-restart-arm');
      }

      // Handle Ctrl+Backspace (word deletion) or AltGr combinations
      const isAltGr = e.ctrlKey && e.altKey;
      const isCtrlBackspace = e.ctrlKey && !e.altKey && e.key === 'Backspace';

      if (!isAltGr && !isCtrlBackspace) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
      }

      if (e.key.length > 1 && e.key !== 'Enter' && e.key !== 'Backspace') return;
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

          if (isCtrlBackspace) {
            e.preventDefault();
            const trimmed = currentInput.trimEnd();
            const lastSpaceIdx = trimmed.lastIndexOf(' ');
            const sliceIdx = lastSpaceIdx === -1 ? 0 : lastSpaceIdx + 1;
            const deletedCount = currentInput.length - sliceIdx;
            typing.setInputSync((prev: string) => prev.slice(0, sliceIdx));
            for (let d = 0; d < Math.max(1, deletedCount); d++) {
              typing.keystrokeLog.current.push({ key: 'Backspace', expected: '', time: Date.now(), isError: false, isBackspace: true });
            }
          } else {
            typing.setInputSync((prev: string) => prev.slice(0, -1));
            typing.keystrokeLog.current.push({ key: 'Backspace', expected: '', time: Date.now(), isError: false, isBackspace: true });
          }

          audio.playSound('click');
          typing.setCombo(0);
          typing.comboRef.current = 0;
          audio.setComboRef(0);
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
        const isMatch = isCharacterMatch(typedChar, expectedChar);
        const isError = !isMatch;
        const resolvedChar = isMatch ? expectedChar : typedChar;

        // Auto-indentation in CODE mode: When Enter is correctly typed on an indented block,
        // automatically advance across leading spaces on the next line.
        if (!isError && resolvedChar === '\n' && cfg.level === 'CODE') {
          let nextIdx = currentInput.length + 1;
          let autoIndent = '';
          while (nextIdx < typing.targetText.length && typing.targetText[nextIdx] === ' ') {
            autoIndent += ' ';
            nextIdx++;
          }
          if (autoIndent.length > 0) {
            const fullAdvance = '\n' + autoIndent;
            const nextInput = currentInput + fullAdvance;
            typing.setInputSync((prev: string) => prev + fullAdvance);
            typing.keystrokeLog.current.push({ key: '\n', expected: '\n', time: now, isError: false });
            for (let s = 0; s < autoIndent.length; s++) {
              typing.keystrokeLog.current.push({ key: ' ', expected: ' ', time: now, isError: false });
            }
            const nextCombo = typing.comboRef.current + 1 + autoIndent.length;
            typing.comboRef.current = nextCombo;
            audio.setComboRef(nextCombo);
            typing.setCombo(nextCombo);
            typing.setMaxCombo((prev: number) => Math.max(prev, nextCombo));
            audio.playSound('key');

            if (nextInput.length >= typing.targetText.length) {
              typing.finishTest(now, nextInput);
            }
            return;
          }
        }

        const nextInput = currentInput + resolvedChar;
        typing.setInputSync((prev: string) => prev + resolvedChar);
        typing.keystrokeLog.current.push({ key: typedChar, expected: expectedChar, time: now, isError });

        if (isError) {
          audio.playSound('error');
          typing.setCombo(0);
          typing.comboRef.current = 0;
          audio.setComboRef(0);
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
          audio.setComboRef(nextCombo);
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
