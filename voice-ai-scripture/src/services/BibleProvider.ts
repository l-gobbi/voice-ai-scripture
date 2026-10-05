import {
  scriptureCatalog,
  SupportedTranslation,
  BUNDLED_TRANSLATIONS,
  PT_TRANSLATIONS,
} from './ScriptureCatalog';

export type { SupportedTranslation };
export { BUNDLED_TRANSLATIONS, PT_TRANSLATIONS };

export interface BiblePassage {
  reference: string;
  text: string;
  translation: SupportedTranslation | string;
  language: 'en' | 'pt';
}

/**
 * @deprecated Legacy shallow facade retired in Ticket 48.
 * Call `scriptureCatalog.resolvePassage(...)` directly.
 */
export interface BibleProvider {
  fetchPassage(reference: string, translation: SupportedTranslation | string): Promise<BiblePassage | null>;
}

export function isPortugueseTranslation(translation?: string | null): boolean {
  return scriptureCatalog.isPortugueseTranslation(translation);
}

export function isBundledTranslation(raw: string): raw is SupportedTranslation {
  return scriptureCatalog.isBundledTranslation(raw);
}

export class LocalBibleProvider implements BibleProvider {
  async fetchPassage(reference: string, translation: SupportedTranslation | string): Promise<BiblePassage | null> {
    const canonTrans = scriptureCatalog.canonicalizeTranslation(translation);
    if (!canonTrans) {
      return null;
    }

    const resolved = scriptureCatalog.resolvePassage(reference, canonTrans);
    if (!resolved || !resolved.text) {
      return null;
    }

    const language: 'en' | 'pt' = scriptureCatalog.isPortugueseTranslation(canonTrans) ? 'pt' : 'en';

    return {
      reference: resolved.canonicalRef,
      text: resolved.text,
      translation: canonTrans,
      language,
    };
  }
}

export class SimulatedBibleProvider implements BibleProvider {
  private passages: Map<string, BiblePassage> = new Map();
  private handler?: (reference: string, translation: string) => Promise<BiblePassage | null> | BiblePassage | null;

  constructor(
    initialPassages?: Record<string, BiblePassage>,
    handler?: (reference: string, translation: string) => Promise<BiblePassage | null> | BiblePassage | null
  ) {
    if (initialPassages) {
      for (const [key, passage] of Object.entries(initialPassages)) {
        this.passages.set(key, passage);
      }
    }
    this.handler = handler;
  }

  setPassage(reference: string, translation: string, passage: BiblePassage | null): void {
    const key = `${reference}:${translation.toUpperCase()}`;
    if (passage) {
      this.passages.set(key, passage);
    } else {
      this.passages.delete(key);
    }
  }

  async fetchPassage(reference: string, translation: string): Promise<BiblePassage | null> {
    if (this.handler) {
      return this.handler(reference, translation);
    }
    const key = `${reference}:${translation.toUpperCase()}`;
    return this.passages.get(key) ?? null;
  }
}

export function createDefaultBibleProvider(): BibleProvider {
  return new LocalBibleProvider();
}

export const bibleProvider: BibleProvider = createDefaultBibleProvider();
