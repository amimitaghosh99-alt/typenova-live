/**
 * Text rules shared by the drill generators.
 *
 * Weak-key targets come from the typing heatmap, which buckets keystrokes by
 * the *expected character* — so `;`, `?`, `"` and `4` are all legitimate
 * practice targets. The drill sanitiser used to run `[^a-z\s]` over generated
 * text, which deleted exactly those characters: asking for a punctuation or
 * number drill produced plain letters and the weakness was never practised.
 *
 * Kept free of React and browser globals so it can be exercised on its own.
 */

/** One character that has no place in a drill. */
export const IS_DISALLOWED_CHAR = /[^a-z0-9 .,;:'"!?()[\]{}<>/\\=+\-_*&%$#@^~`|]/;

/** The same set, global, for stripping. Derived from the single-character form
 *  so the two cannot drift apart — and kept separate from it because `.test()`
 *  on a global regex advances `lastIndex` and would then answer differently on
 *  the next call. */
export const DISALLOWED_CHARS = new RegExp(IS_DISALLOWED_CHAR.source, 'g');

/** Models write prose, and prose uses characters no keyboard has a key for. */
const TYPOGRAPHIC_REPLACEMENTS: Array<[RegExp, string]> = [
    [/[\u2018\u2019\u201A\u201B]/g, "'"],
    [/[\u201C\u201D\u201E\u201F]/g, '"'],
    [/[\u2013\u2014\u2212]/g, '-'],
    [/\u2026/g, '...'],
];

/** How many copies of an injected target to place, so it is actually drilled. */
const INJECTIONS_PER_TARGET = 3;

/** Reduce generated text to characters that exist on the keyboard. */
export function sanitizeDrillText(raw: string): string {
    let text = raw;
    for (const [pattern, replacement] of TYPOGRAPHIC_REPLACEMENTS) {
        text = text.replace(pattern, replacement);
    }
    return text
        // Letters share a physical key regardless of case, and the heatmap merges
        // them, so a lowercase drill still trains the target key.
        .toLowerCase()
        // Collapse newlines/tabs first: deleting them outright would glue two
        // words together.
        .replace(/\s+/g, ' ')
        .replace(DISALLOWED_CHARS, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Heatmap keys reduced to the literal characters worth drilling. SPACE and
 * ENTER drop out: every drill already contains spaces, and a newline cannot be
 * spliced into a word without breaking the layout.
 */
export function targetChars(weakKeys: string[]): string[] {
    const chars = weakKeys
        .filter(k => k !== 'SPACE' && k !== 'ENTER')
        .map(k => k.toLowerCase())
        .filter(k => k.length === 1 && k !== ' ' && !IS_DISALLOWED_CHAR.test(k));
    return Array.from(new Set(chars));
}

/**
 * Normalizes digraph targets (2-character transition pairs e.g. "th", "pl").
 */
export function targetDigraphs(targets: string[]): string[] {
    const cleaned = targets
        .filter(t => t && t !== 'SPACE' && t !== 'ENTER')
        .map(t => t.toLowerCase().replace(/[^a-z0-9]/g, ''))
        .filter(t => t.length === 2);
    return Array.from(new Set(cleaned));
}

/**
 * Splice in every target the text doesn't already contain.
 *
 * Supports both single characters (';', 'x') and 2-character digraphs ('pl', 'th').
 */
export function ensureTargets(text: string, targets: string[]): string {
    const words = text.split(' ').filter(Boolean);
    const missing = targets.filter(t => !text.toLowerCase().includes(t.toLowerCase()));
    if (missing.length === 0) return words.join(' ');
    if (words.length === 0) return missing.join(' ');

    // Round-robin, so injections spread across the drill instead of piling onto one word.
    let cursor = 0;
    for (const target of missing) {
        for (let n = 0; n < INJECTIONS_PER_TARGET; n++) {
            const at = cursor++ % words.length;
            const word = words[at];
            
            if (target.length === 2) {
                // Digraph injection: place inside word
                const mid = Math.ceil(word.length / 2);
                words[at] = word.slice(0, mid) + target + word.slice(mid);
            } else if (/[a-z0-9]/.test(target)) {
                // Single letter or digit
                const mid = Math.ceil(word.length / 2);
                words[at] = word.slice(0, mid) + target + word.slice(mid);
            } else {
                // Punctuation
                words[at] = word + target;
            }
        }
    }
    return words.join(' ');
}

/**
 * Weak-word targets reduced to clean drill words (the whole-word counterpart
 * of `targetChars`). Internal whitespace collapses to a hyphen so a stray
 * multi-word entry still produces one typeable token.
 */
export function targetWords(words: string[]): string[] {
    const cleaned = words
        .map(w => w.toLowerCase().replace(/[^a-z0-9'\u2019 -]/g, '').trim())
        .map(w => w.replace(/\s+/g, '-'))
        .filter(w => w.length >= 3);
    return Array.from(new Set(cleaned));
}

/**
 * Whole-word counterpart of `ensureTargets`. A word drill must contain every
 * target as its own word — splicing letters inside random words (what
 * `ensureTargets` does for characters) would not rehearse the word's motor
 * sequence. Missing targets are inserted at spread positions, twice each, so
 * even a short review hits every word.
 */
export function ensureWordTargets(text: string, targets: string[]): string {
    const normalized = targetWords(targets);
    const parts = text.split(' ').filter(Boolean);
    const present = new Set(parts.map(p => p.toLowerCase()));
    const missing = normalized.filter(w => !present.has(w));
    if (missing.length === 0) return parts.join(' ');
    if (parts.length === 0) return missing.join(' ');

    let cursor = 0;
    for (const word of missing) {
        for (let n = 0; n < 2; n++) {
            cursor += 3;
            const at = Math.min(parts.length, cursor);
            parts.splice(at, 0, word);
        }
    }
    return parts.join(' ');
}

/**
 * Procedural word-drill builder. `pool` is an externally-supplied word source
 * (the caller derives it from NOVICE_SENTENCES) so this stays pure and
 * unit-testable. Related words — pool words that share a stem or appear as a
 * substring of a target — fill out the passage around the targets themselves;
 * `ensureWordTargets` then guarantees nothing was lost to the shuffle.
 */
export function buildProceduralWordDrill(targets: string[], pool: string[], length = 20): string {
    const cleaned = targetWords(targets);
    if (cleaned.length === 0) return '';

    const targetSet = new Set(cleaned);
    const stems = cleaned.map(t => t.slice(0, 3));
    const related = pool.filter(w => {
        const word = w.toLowerCase();
        if (targetSet.has(word) || word.length < 3) return false;
        return stems.some(stem => word.includes(stem)) || cleaned.some(t => t.includes(word));
    });

    const base = related.length >= 10 ? [...cleaned, ...related] : [...cleaned, ...pool];
    const drillWords: string[] = [];
    for (let i = 0; i < length; i++) {
        drillWords.push(base[Math.floor(Math.random() * base.length)] || cleaned[i % cleaned.length]);
    }
    return ensureWordTargets(drillWords.join(' '), cleaned);
}
