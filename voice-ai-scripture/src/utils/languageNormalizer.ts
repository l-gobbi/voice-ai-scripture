/**
 * languageNormalizer.ts
 *
 * Pure utility for normalizing language codes to canonical BCP-47 tags
 * for native speech recognition and synthesis.
 */

export function normalizeSpeechLanguage(language?: string): string {
  if (!language || language.trim() === '') return 'en-US';
  const clean = language.trim().toLowerCase();
  if (clean === 'pt' || clean === 'pt-br') return 'pt-BR';
  if (clean === 'en' || clean === 'en-us') return 'en-US';
  return language;
}
