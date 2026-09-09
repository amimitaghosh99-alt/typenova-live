import { useState, useCallback } from 'react';
import { NOVICE_SENTENCES } from '@/data/constants';
import { toast } from 'sonner';
import { chatCompletion, hasAIKey } from '@/lib/aiClient';
import {
  sanitizeDrillText, targetChars, targetDigraphs, ensureTargets,
  ensureWordTargets, targetWords, buildProceduralWordDrill,
} from '@/lib/drillText';

/** Chrome's on-device model. Not in lib.dom, and absent in every other browser. */
type WindowAI = {
  languageModel?: { create?: () => Promise<{ prompt: (input: string) => Promise<string> }> };
};

export function useSmartDrills() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateProceduralDrill = (weakTargets: string[]): string => {
    const singleTargets = targetChars(weakTargets);
    const digraphTargets = targetDigraphs(weakTargets);
    const allTargets = [...digraphTargets, ...singleTargets];

    // 1. Gather all words from NOVICE_SENTENCES.
    const allWords = NOVICE_SENTENCES.flatMap(sentence =>
      sentence.split(/\s+/).map(w => w.replace(/[^a-z0-9]/gi, '').toLowerCase())
    ).filter(w => w.length > 0);

    // 2. Find words that contain ANY of the targets (digraphs or single keys)
    const targetWords = allWords.filter(word =>
      allTargets.some(target => word.includes(target))
    );

    // 3. Fallback pool with immutable safety guarantees
    const fallbackBase = allWords.length > 0 ? allWords : ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog'];
    const pool = targetWords.length >= 10 ? targetWords : fallbackBase;

    // 4. Stitch together ~15 random words
    const drillWords: string[] = [];
    for (let i = 0; i < 15; i++) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      drillWords.push(pool[randomIndex] || 'practice');
    }

    return ensureTargets(drillWords.join(' '), allTargets);
  };

  const generateDrill = useCallback(async (weakTargets: string[]): Promise<{ text: string, engine: 'cloud' | 'ai' | 'procedural' }> => {
    setIsGenerating(true);
    setError(null);

    const singleTargets = targetChars(weakTargets);
    const digraphTargets = targetDigraphs(weakTargets);
    const allTargets = [...digraphTargets, ...singleTargets];
    const isDigraphDrill = digraphTargets.length > 0;

    const keysStr = allTargets.length > 0 ? allTargets.join(', ') : 'a, e, i, o, u';
    const prompt = isDigraphDrill
      ? `Write a natural, rhythmic 15-word typing practice sentence that heavily features words containing these letter transitions: ${keysStr}. Include every transition naturally within common English words. Use proper punctuation, grammar and spacing. Do not include explanations, return only the sentence.`
      : `Write a natural, creative 15-word typing practice sentence that heavily features these characters: ${keysStr}. Include every one of them literally, digits and punctuation marks included. IMPORTANT: Use proper grammar and spacing. Never place punctuation inside of words (e.g. don't do "struc,ture"). Do not include any explanations, just return the sentence.`;

    try {
      // ─── TIER 1: CLOUD AI (Universal BYOK) ─────────────────────────
      if (hasAIKey()) {
        try {
          const { text: resultText } = await chatCompletion(
            [{ role: 'user', content: prompt }],
            { maxTokens: 50 },
          );

          const cleanText = ensureTargets(sanitizeDrillText(resultText), allTargets);
          if (cleanText.length > 0) return { text: cleanText, engine: 'cloud' };
        } catch (cloudError) {
          const detail = cloudError instanceof Error ? cloudError.message : 'Unknown error';
          console.warn('Cloud AI failed, falling back to local...', cloudError);
          toast.error('Cloud API Error', { description: `${detail} Falling back to local engines...` });
        }
      }

      // ─── TIER 2: LOCAL AI (Gemini Nano via window.ai) ──────────────
      const winAi = (window as Window & { ai?: WindowAI }).ai;
      if (winAi?.languageModel && typeof winAi.languageModel.create === 'function') {
        try {
          const session = await winAi.languageModel.create();
          const result = await session.prompt(prompt);
          if (result) {
            const cleanText = ensureTargets(sanitizeDrillText(result), allTargets);
            if (cleanText.length > 0) return { text: cleanText, engine: 'ai' };
          }
        } catch (aiError) {
          console.warn("window.ai failed, falling back to procedural...", aiError);
        }
      }

      // ─── TIER 3: PROCEDURAL FALLBACK ───────────────────────────────
      return { text: generateProceduralDrill(weakTargets), engine: 'procedural' };

    } catch (err) {
      console.error('Drill generation failed:', err);
      setError('Failed to generate drill.');
      return { text: generateProceduralDrill(weakTargets), engine: 'procedural' }; // Ultimate fallback
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Word-level counterpart of `generateDrill`. Where the key drill targets
   * single characters from the heatmap, this targets whole words from the
   * weakness map — the motor-sequence lens. Same three tiers, same fallback
   * discipline: cloud BYOK, then Gemini Nano, then the pure procedural
   * builder, and the returned text ALWAYS contains every target word.
   */
  const generateWordDrill = useCallback(async (weakWords: string[]): Promise<{ text: string; engine: 'cloud' | 'ai' | 'procedural' }> => {
    const targets = targetWords(weakWords);
    setIsGenerating(true);
    setError(null);

    const wordsStr = targets.length > 0 ? targets.join(', ') : 'structure, quiet, pattern, rhythm';
    const prompt = `Write a natural, flowing 30-word typing practice passage that uses each of these words at least twice: ${wordsStr}. Surround them with common English words. Use proper grammar and spacing. Do not include explanations, just return the passage.`;

    try {
      // ─── TIER 1: CLOUD AI (Universal BYOK) ─────────────────────────
      if (hasAIKey()) {
        try {
          const { text: resultText } = await chatCompletion(
            [{ role: 'user', content: prompt }],
            { maxTokens: 90 },
          );
          const cleanText = ensureWordTargets(sanitizeDrillText(resultText), targets);
          if (cleanText.length > 0) return { text: cleanText, engine: 'cloud' };
        } catch (cloudError) {
          const detail = cloudError instanceof Error ? cloudError.message : 'Unknown error';
          console.warn('Cloud AI failed, falling back to local...', cloudError);
          toast.error('Cloud API Error', { description: `${detail} Falling back to local engines...` });
        }
      }

      // ─── TIER 2: LOCAL AI (Gemini Nano via window.ai) ──────────────
      const winAi = (window as Window & { ai?: WindowAI }).ai;
      if (winAi?.languageModel && typeof winAi.languageModel.create === 'function') {
        try {
          const session = await winAi.languageModel.create();
          const result = await session.prompt(prompt);
          if (result) {
            const cleanText = ensureWordTargets(sanitizeDrillText(result), targets);
            if (cleanText.length > 0) return { text: cleanText, engine: 'ai' };
          }
        } catch (aiError) {
          console.warn("window.ai failed, falling back to procedural...", aiError);
        }
      }

      // ─── TIER 3: PROCEDURAL FALLBACK ───────────────────────────────
      const pool = NOVICE_SENTENCES.flatMap(sentence =>
        sentence.split(/\s+/).map(w => w.replace(/[^a-z0-9]/gi, '').toLowerCase())
      ).filter(w => w.length >= 3);
      return { text: buildProceduralWordDrill(targets, pool), engine: 'procedural' };

    } catch (err) {
      console.error('Word drill generation failed:', err);
      setError('Failed to generate word drill.');
      const pool = NOVICE_SENTENCES.flatMap(sentence =>
        sentence.split(/\s+/).map(w => w.replace(/[^a-z0-9]/gi, '').toLowerCase())
      ).filter(w => w.length >= 3);
      return { text: buildProceduralWordDrill(targets, pool), engine: 'procedural' }; // Ultimate fallback
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generateDrill,
    generateWordDrill,
    isGenerating,
    error
  };
}
