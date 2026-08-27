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
 * Splice in every target the text doesn't already contain.
 *
 * The procedural word pool is ordinary English — no digits, almost no
 * punctuation — and a model may ignore the instruction to feature them, so
 * without this step a drill for `;` can come back with no `;` in it.
 */
export function ensureTargets(text: string, targets: string[]): string {
    const words = text.split(' ').filter(Boolean);
    const missing = targets.filter(ch => !text.includes(ch));
    if (missing.length === 0) return words.join(' ');
    if (words.length === 0) return missing.join(' ');

    // Round-robin, so injections spread across the drill instead of piling onto
    // one word.
    let cursor = 0;
    for (const ch of missing) {
        for (let n = 0; n < INJECTIONS_PER_TARGET; n++) {
            const at = cursor++ % words.length;
            const word = words[at];
            // Punctuation reads naturally at a word edge; digits and letters belong
            // inside a word, which is also where they are hardest to reach.
            if (/[a-z0-9]/.test(ch)) {
                const mid = Math.ceil(word.length / 2);
                words[at] = word.slice(0, mid) + ch + word.slice(mid);
            } else {
                words[at] = word + ch;
            }
        }
    }
    return words.join(' ');
}
