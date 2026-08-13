import { useState, useCallback } from 'react';
import { NOVICE_SENTENCES } from '@/data/constants';
import { toast } from 'sonner';
import { chatCompletion, hasAIKey } from '@/lib/aiClient';

export function useSmartDrills() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateProceduralDrill = (weakKeys: string[]): string => {
    // 1. Gather all words from NOVICE_SENTENCES
    const allWords = NOVICE_SENTENCES.flatMap(sentence =>
      sentence.split(' ').map(w => w.replace(/[^a-zA-Z]/g, '').toLowerCase())
    ).filter(w => w.length > 0);

    // 2. Find words that contain ANY of the weak keys
    const weakLetters = weakKeys.map(k => k.toLowerCase());
    const targetWords = allWords.filter(word => 
      weakLetters.some(letter => word.includes(letter))
    );

    // 3. Fallback if no words match (unlikely, but safe)
    const pool = targetWords.length >= 10 ? targetWords : allWords;

    // 4. Stitch together ~15 random words
    const drillWords = [];
    for (let i = 0; i < 15; i++) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      drillWords.push(pool[randomIndex]);
    }

    return drillWords.join(' ');
  };

  const generateDrill = useCallback(async (weakKeys: string[]): Promise<{ text: string, engine: 'cloud' | 'ai' | 'procedural' }> => {
    setIsGenerating(true);
    setError(null);

    const keysStr = weakKeys.length > 0 ? weakKeys.join(', ') : 'a, e, i, o, u';
    const prompt = `Write a natural, creative 15-word typing practice sentence that heavily features these characters: ${keysStr}. IMPORTANT: Use proper grammar and spacing. Never place punctuation inside of words (e.g. don't do "struc,ture"). Do not include any explanations, just return the sentence.`;

    try {
      // ─── TIER 1: CLOUD AI (Universal BYOK) ─────────────────────────
      if (hasAIKey()) {
        try {
          const { text: resultText } = await chatCompletion(
            [{ role: 'user', content: prompt }],
            { maxTokens: 50 },
          );

          const cleanText = resultText
            .toLowerCase()
            .replace(/[^a-z\s]/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
          if (cleanText.length > 0) return { text: cleanText, engine: 'cloud' };
        } catch (cloudError) {
          const detail = cloudError instanceof Error ? cloudError.message : 'Unknown error';
          console.warn('Cloud AI failed, falling back to local...', cloudError);
          toast.error('Cloud API Error', { description: `${detail} Falling back to local engines...` });
        }
      }

      // ─── TIER 2: LOCAL AI (Gemini Nano via window.ai) ──────────────
      const winAi = (window as any).ai;
      if (winAi && winAi.languageModel && typeof winAi.languageModel.create === 'function') {
        try {
          const session = await winAi.languageModel.create();
          const result = await session.prompt(prompt);
          if (result && typeof result === 'string') {
            const cleanText = result
              .toLowerCase()
              .replace(/[^a-z\s]/gi, '')
              .replace(/\s+/g, ' ')
              .trim();
            if (cleanText.length > 0) return { text: cleanText, engine: 'ai' };
          }
        } catch (aiError) {
          console.warn("window.ai failed, falling back to procedural...", aiError);
        }
      }

      // ─── TIER 3: PROCEDURAL FALLBACK ───────────────────────────────
      return { text: generateProceduralDrill(weakKeys), engine: 'procedural' };

    } catch (err) {
      console.error('Drill generation failed:', err);
      setError('Failed to generate drill.');
      return { text: generateProceduralDrill(weakKeys), engine: 'procedural' }; // Ultimate fallback
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generateDrill,
    isGenerating,
    error
  };
}
