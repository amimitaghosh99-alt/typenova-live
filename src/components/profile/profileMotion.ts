/**
 * Moved to `src/lib/motion.ts`.
 *
 * The vocabulary is app-wide now — the compete entry screen, the room browser
 * and the ranked record all pull from it — so keeping it under `profile/` made
 * the folder name misleading. This shim exists so the dossier
 * (`pages/OperatorDossier.tsx`) and the forge (`ProfileCustomizationMenu.tsx`)
 * keep working unchanged. Import from `@/lib/motion` in anything new.
 */
export * from '@/lib/motion';
