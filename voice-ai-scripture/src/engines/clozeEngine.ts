/**
 * clozeEngine.ts
 *
 * Pure deterministic engine for cloze token generation, masking,
 * interactive word peeking, and assisted score evaluation.
 */

export interface ClozeToken {
  word: string;
  masked: string;
  isRevealed: boolean;
  trailingSpace: boolean;
}

export type ClozeMode = 'first-letter' | 'blank';

/**
 * Mask a single word token according to the specified mode.
 * Preserves leading/trailing punctuation and casing.
 */
function maskWord(tokenStr: string, mode: ClozeMode): string {
  // Regex splitting word characters from surrounding punctuation
  // Matches leading non-letters, letters/word-chars, trailing punctuation
  const match = tokenStr.match(/^([^a-zA-Z\u00C0-\u024F]*)([a-zA-Z\u00C0-\u024F]+)(.*)$/);
  if (!match) {
    // Pure punctuation/numbers/symbols: leave untouched
    return tokenStr;
  }

  const [, prefix, letters, suffix] = match;

  if (mode === 'blank') {
    return prefix + '_'.repeat(letters.length) + suffix;
  }

  // 'first-letter' mode: retain 1st letter, underscore the rest
  const firstLetter = letters[0];
  const remainingBlanks = '_'.repeat(letters.length - 1);
  return prefix + firstLetter + remainingBlanks + suffix;
}

/**
 * Generates an array of ClozeTokens from verse text.
 */
export function generateClozeTokens(text: string, mode: ClozeMode): ClozeToken[] {
  if (!text || text.trim() === '') {
    return [];
  }

  // Split by whitespace while keeping track of spaces
  const rawWords = text.trim().split(/\s+/);

  return rawWords.map((word, index) => {
    const isLast = index === rawWords.length - 1;
    return {
      word,
      masked: maskWord(word, mode),
      isRevealed: false,
      trailingSpace: !isLast,
    };
  });
}

/**
 * Returns a new token list with the specified word index revealed.
 */
export function revealWord(tokens: ClozeToken[], index: number): ClozeToken[] {
  if (index < 0 || index >= tokens.length) {
    return tokens;
  }
  return tokens.map((token, i) =>
    i === index ? { ...token, isRevealed: true } : token
  );
}

/**
 * Returns a new token list with the specified word index hidden again.
 */
export function hideWord(tokens: ClozeToken[], index: number): ClozeToken[] {
  if (index < 0 || index >= tokens.length) {
    return tokens;
  }
  return tokens.map((token, i) =>
    i === index ? { ...token, isRevealed: false } : token
  );
}

/**
 * Evaluates the final recitation score in the presence of assistance (e.g. Word Peek Lifeline).
 *
 * Rules:
 * - If no assistance was used, score is returned untouched.
 * - If assistance was used, scores >= 75% are capped at 75% (assisted review:
 *   schedules reinforcement for tomorrow without resetting multi-day streak).
 * - Genuine lower scores (< 75%) remain uninflated and untouched.
 */
export function evaluateAssistedScore(score: number, assistanceUsed: boolean): number {
  if (!assistanceUsed) {
    return score;
  }
  return Math.min(score, 75);
}
