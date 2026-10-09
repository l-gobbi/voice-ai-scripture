/**
 * languageNormalizer.ts
 *
 * The app's languages, and a pure utility for normalizing language codes to canonical BCP-47
 * tags for native speech recognition and synthesis.
 */

/**
 * A language the app reads, speaks and verifies verses in: Portuguese or English. A verse's
 * language comes from its text, Translation or reference (Scripture Catalog).
 */
export type Language = 'en' | 'pt';

export function normalizeSpeechLanguage(language?: string): string {
  if (!language || language.trim() === '') return 'en-US';
  const clean = language.trim().toLowerCase();
  if (clean === 'pt' || clean === 'pt-br') return 'pt-BR';
  if (clean === 'en' || clean === 'en-us') return 'en-US';
  return language;
}
