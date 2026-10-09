import {
  CanonBook,
  CANON_BOOKS,
  getCanonBook,
  getChapterCount,
  getVerseCount,
  searchCanonBooks,
} from '../data/bibleCanon';
import blivreData from '../data/bibles/blivre.json';
import onbvData from '../data/bibles/onbv.json';
import bsbData from '../data/bibles/bsb.json';
import webData from '../data/bibles/web.json';

export type { CanonBook };
/** The bundled Translations: open-licensed texts only (ADR 0018). */
export type SupportedTranslation = 'BLIVRE' | 'ONBV' | 'BSB' | 'WEB';

export const BUNDLED_TRANSLATIONS: readonly SupportedTranslation[] = [
  'BLIVRE',
  'ONBV',
  'BSB',
  'WEB',
] as const;

/**
 * Portuguese Translation labels. Besides the bundled ones, these are labels the app has no
 * text for (the learner's own wording, or verses saved in ALMEIDA before ADR 0018); they keep
 * their language so Speech Synthesis and recognition still use Portuguese.
 */
export const PT_TRANSLATIONS: ReadonlySet<string> = new Set([
  'BLIVRE',
  'ONBV',
  'ALMEIDA',
  'ARA',
  'ARC',
  'ACF',
  'NAA',
  'NVI',
  'NTLH',
  'NVT',
]);

/** English Translation labels: the bundled ones and labels without text, such as KJV. */
export const EN_TRANSLATIONS: ReadonlySet<string> = new Set([
  'BSB',
  'WEB',
  'KJV',
  'ESV',
  'NIV',
  'NKJV',
  'NASB',
  'NLT',
  'MSG',
  'ASV',
]);

/** The per-language default Translation, used when no Preferred Translation applies. */
const DEFAULT_TRANSLATIONS: Readonly<Record<'en' | 'pt', SupportedTranslation>> = {
  pt: 'BLIVRE',
  en: 'BSB',
};

const PT_MARKER_WORDS = new Set([
  'senhor', 'pastor', 'deus', 'jesus', 'porque', 'para', 'com', 'como',
  'meu', 'minha', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas',
  'nosso', 'nossa', 'nossos', 'nossas', 'pelo', 'pela', 'pelos', 'pelas',
  'dos', 'das', 'aos', 'nas', 'nos', 'não', 'ele', 'ela', 'eles', 'elas',
  'voce', 'você', 'tudo', 'nada', 'mais', 'mas', 'faltara', 'faltará'
]);

/**
 * What the app must know about a bundled Translation to credit it: its licence, the notice
 * the licence requires, and where the text comes from. Written into each dataset by
 * scripts/build-bundled-bibles.js.
 */
export interface TranslationMetadata {
  code: SupportedTranslation;
  /** Short display name, e.g. "Bíblia Livre". */
  name: string;
  /** Full title as the licensor gives it, e.g. "Biblica® Open Nova Bíblia Viva™". */
  fullName: string;
  language: 'en' | 'pt';
  license: string;
  /** Attribution notice required by the licence (or courtesy credit), verbatim. May span lines. */
  notice: string;
  /** What the build changed in the source text (markers removed, whitespace normalized). */
  changes: string;
  sourceUrl: string;
}

interface BibleDataset {
  translation: SupportedTranslation;
  name: string;
  fullName: string;
  language: 'en' | 'pt';
  license: string;
  notice: string;
  changes: string;
  sourceUrl: string;
  books: Record<string, Record<string, Record<string, string>>>;
}

const DATASETS: Record<SupportedTranslation, BibleDataset> = {
  BLIVRE: blivreData as BibleDataset,
  ONBV: onbvData as BibleDataset,
  BSB: bsbData as BibleDataset,
  WEB: webData as BibleDataset,
};

/** Spellings of each bundled Translation, compared after `compactTranslationName`. */
const TRANSLATION_ALIASES: Record<SupportedTranslation, readonly string[]> = {
  BLIVRE: ['blivre', 'biblialivre'],
  ONBV: ['onbv', 'nbv', 'novabibliaviva', 'opennovabibliaviva', 'biblicaopennovabibliaviva'],
  BSB: ['bsb', 'berean', 'bereanstandard', 'bereanstandardbible', 'bereanbible'],
  WEB: ['web', 'worldenglishbible'],
};

const TRANSLATION_BY_ALIAS = new Map<string, SupportedTranslation>(
  (Object.keys(TRANSLATION_ALIASES) as SupportedTranslation[]).flatMap((code) =>
    TRANSLATION_ALIASES[code].map((alias) => [alias, code] as [string, SupportedTranslation])
  )
);

/** "Bíblia Livre" → "biblialivre": lower case, no diacritics, letters and digits only. */
function compactTranslationName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export interface NormalizedReference {
  bookId: string;
  bookName: string;
  chapter: number;
  startVerse: number;
  endVerse?: number;
  canonicalRef: string;
  language: 'en' | 'pt';
}

export interface ResolvedPassage extends NormalizedReference {
  translation: string;
  text?: string;
  isBundled: boolean;
}

function sanitizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]/g, ' ')      // replace non-alphanumeric with spaces
    .replace(/\s+/g, ' ')            // collapse multiple spaces
    .trim();
}

export class ScriptureCatalog {
  /**
   * Resolves a reference string into its canonical metadata, language, and optional bundled text.
   */
  resolvePassage(query: string, translation?: string): ResolvedPassage | null {
    const norm = this.resolveReference(query);
    if (!norm) return null;

    const chosenTrans = translation || this.getDefaultTranslation(norm.language);
    const isBundled = this.isBundledTranslation(chosenTrans);

    let text: string | undefined;
    if (isBundled) {
      const fetched = this.fetchPassageText(
        norm.bookId,
        norm.chapter,
        norm.startVerse,
        norm.endVerse,
        chosenTrans
      );
      if (fetched) {
        text = fetched;
      }
    }

    return {
      ...norm,
      translation: chosenTrans,
      text,
      isBundled,
    };
  }

  /**
   * Parses arbitrary user query into canonical book, chapter, and verse boundaries.
   */
  resolveReference(rawInput: string): NormalizedReference | null {
    if (!rawInput || typeof rawInput !== 'string') {
      return null;
    }

    const trimmed = rawInput.trim();
    if (!trimmed) {
      return null;
    }

    const match = trimmed.match(
      /^(?<rawBook>.*?)\s*(?<rawChapter>\d+)[:.](?<rawStartVerse>\d+)(?:\s*-\s*(?<rawEndVerse>\d+))?$/
    );
    if (!match || !match.groups) {
      return null;
    }

    const rawBook = match.groups.rawBook.trim();
    const chapter = parseInt(match.groups.rawChapter, 10);
    const startVerse = parseInt(match.groups.rawStartVerse, 10);
    const endVerse = match.groups.rawEndVerse ? parseInt(match.groups.rawEndVerse, 10) : undefined;

    if (chapter <= 0 || startVerse <= 0) {
      return null;
    }

    if (endVerse !== undefined && endVerse < startVerse) {
      return null;
    }

    const sanitizedBook = sanitizeString(rawBook);
    if (!sanitizedBook) {
      return null;
    }

    const normalizedBookForm = sanitizedBook.replace(/^([1-3])\s*([a-z]+)$/, '$1 $2');
    const collapsedBookForm = sanitizedBook.replace(/^([1-3])\s*([a-z]+)$/, '$1$2');

    if (rawBook.toLowerCase().trim() === 'jó') {
      return this.buildNormalized(getCanonBook('JOB')!, chapter, startVerse, endVerse, 'pt');
    }

    for (const book of CANON_BOOKS) {
      const matchedPt = book.ptAliases.some((alias) => {
        const cleanAlias = sanitizeString(alias);
        return (
          sanitizedBook === cleanAlias ||
          normalizedBookForm === cleanAlias ||
          collapsedBookForm === cleanAlias
        );
      });

      if (matchedPt) {
        return this.buildNormalized(book, chapter, startVerse, endVerse, 'pt');
      }

      const matchedEn = book.enAliases.some((alias) => {
        const cleanAlias = sanitizeString(alias);
        return (
          sanitizedBook === cleanAlias ||
          normalizedBookForm === cleanAlias ||
          collapsedBookForm === cleanAlias
        );
      });

      if (matchedEn) {
        return this.buildNormalized(book, chapter, startVerse, endVerse, 'en');
      }
    }

    return null;
  }

  private buildNormalized(
    book: CanonBook,
    chapter: number,
    startVerse: number,
    endVerse: number | undefined,
    language: 'en' | 'pt'
  ): NormalizedReference {
    const bookName = language === 'pt' ? book.ptName : book.enName;
    const span = endVerse !== undefined ? `${startVerse}-${endVerse}` : `${startVerse}`;
    return {
      bookId: book.id,
      bookName,
      chapter,
      startVerse,
      endVerse,
      canonicalRef: `${bookName} ${chapter}:${span}`,
      language,
    };
  }

  /**
   * Intelligently detects whether a verse is Portuguese or English based on text diacritics,
   * marker vocabulary, translation codes, or book reference names.
   */
  detectLanguage(verse: { text?: string; reference?: string; translation?: string }): 'en' | 'pt' {
    if (verse.text && verse.text.trim().length > 0) {
      const raw = verse.text;
      const hasPtDiacritics = /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(raw);

      const words = raw
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .split(/\s+/)
        .map((w) => w.replace(/[^\p{L}]/gu, ''))
        .filter(Boolean);

      const ptMatches = words.filter((w) => PT_MARKER_WORDS.has(w)).length;

      if (hasPtDiacritics || ptMatches >= 2) {
        return 'pt';
      }
    }

    const translationLanguage = this.languageOfTranslation(verse.translation);
    if (translationLanguage) {
      return translationLanguage;
    }

    if (verse.reference) {
      const norm = this.resolveReference(verse.reference);
      if (norm) {
        return norm.language;
      }
    }

    return 'en';
  }

  getBooks(testament?: 'OT' | 'NT', query?: string): readonly CanonBook[] {
    if (query && query.trim()) {
      return searchCanonBooks(query, testament);
    }
    if (testament) {
      return CANON_BOOKS.filter((b) => b.testament === testament);
    }
    return [...CANON_BOOKS];
  }

  getBook(bookId: string): CanonBook | null {
    return getCanonBook(bookId) ?? null;
  }

  getChapterCount(bookId: string): number {
    return getChapterCount(bookId);
  }

  getVerseCount(bookId: string, chapter: number): number {
    return getVerseCount(bookId, chapter);
  }

  /**
   * The default Translation for a language, or for the language of a reference: Bíblia Livre
   * in Portuguese and the Berean Standard Bible in English (ADR 0018). Unrecognized references
   * get the English default.
   */
  getDefaultTranslation(referenceOrLanguage: string): SupportedTranslation {
    const language =
      referenceOrLanguage === 'pt' || referenceOrLanguage === 'en'
        ? referenceOrLanguage
        : this.resolveReference(referenceOrLanguage)?.language;
    return language === 'pt' ? DEFAULT_TRANSLATIONS.pt : DEFAULT_TRANSLATIONS.en;
  }

  canonicalizeTranslation(raw?: string | null): SupportedTranslation | null {
    if (!raw || typeof raw !== 'string') return null;
    return TRANSLATION_BY_ALIAS.get(compactTranslationName(raw)) ?? null;
  }

  /**
   * The label a Translation name stands for: the bundled code for any of its spellings
   * ("Berean" → "BSB", "Bíblia Livre" → "BLIVRE"), or a known label without bundled text in
   * upper case ("ara" → "ARA", "KJV"). Null when the name is not a known Translation.
   */
  recognizeTranslation(raw?: string | null): string | null {
    if (!raw || typeof raw !== 'string') return null;
    const code = this.canonicalizeTranslation(raw);
    if (code) return code;
    const upper = raw.trim().toUpperCase();
    return PT_TRANSLATIONS.has(upper) || EN_TRANSLATIONS.has(upper) ? upper : null;
  }

  isBundledTranslation(raw?: string | null): boolean {
    return this.canonicalizeTranslation(raw) !== null;
  }

  isPortugueseTranslation(raw?: string | null): boolean {
    return this.languageOfTranslation(raw) === 'pt';
  }

  /**
   * Display name, language, licence, required notice and source of a bundled Translation
   * (any alias works). Null for labels the app has no text for, such as NVI or ARA.
   */
  getTranslationMetadata(raw?: string | null): TranslationMetadata | null {
    const code = this.canonicalizeTranslation(raw);
    if (!code) return null;
    const { name, fullName, language, license, notice, changes, sourceUrl } = DATASETS[code];
    return { code, name, fullName, language, license, notice, changes, sourceUrl };
  }

  /** Metadata of every bundled Translation, in BUNDLED_TRANSLATIONS order. */
  getBundledTranslations(): TranslationMetadata[] {
    return BUNDLED_TRANSLATIONS.map((code) => this.getTranslationMetadata(code)!);
  }

  /** Language of a bundled Translation or of a known label without bundled text. */
  private languageOfTranslation(raw?: string | null): 'en' | 'pt' | null {
    if (!raw) return null;
    const code = this.canonicalizeTranslation(raw);
    if (code) return DATASETS[code].language;
    const upper = raw.trim().toUpperCase();
    if (PT_TRANSLATIONS.has(upper)) return 'pt';
    if (EN_TRANSLATIONS.has(upper)) return 'en';
    return null;
  }

  fetchPassageText(
    bookId: string,
    chapter: number,
    startVerse: number,
    endVerse?: number,
    translation: string = DEFAULT_TRANSLATIONS.en
  ): string | null {
    // Labels without bundled text (ALMEIDA, KJV, NVI, …) have nothing to look up.
    const code = this.canonicalizeTranslation(translation);
    if (!code) return null;
    const dataset = DATASETS[code];

    const bookData = dataset.books[bookId];
    if (!bookData) return null;

    const chapterData = bookData[String(chapter)];
    if (!chapterData) return null;

    const last = endVerse !== undefined ? endVerse : startVerse;
    const parts: string[] = [];

    for (let v = startVerse; v <= last; v++) {
      const text = chapterData[String(v)];
      if (!text) {
        return null;
      }
      parts.push(text.trim());
    }

    return parts.length > 0 ? parts.join(' ') : null;
  }
}

export const scriptureCatalog = new ScriptureCatalog();
