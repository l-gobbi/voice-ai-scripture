import {
  CanonBook,
  CANON_BOOKS,
  getCanonBook,
  getChapterCount,
  getVerseCount,
  searchCanonBooks,
} from '../data/bibleCanon';
import webData from '../data/bibles/web.json';
import kjvData from '../data/bibles/kjv.json';
import almeidaData from '../data/bibles/almeida.json';
import onbvData from '../data/bibles/onbv.json';

export type { CanonBook };
export type SupportedTranslation = 'WEB' | 'KJV' | 'ALMEIDA' | 'ONBV';

export const BUNDLED_TRANSLATIONS: readonly SupportedTranslation[] = [
  'WEB',
  'KJV',
  'ALMEIDA',
  'ONBV',
] as const;

export const PT_TRANSLATIONS: ReadonlySet<string> = new Set([
  'ALMEIDA',
  'ONBV',
  'NVI',
  'ARA',
  'NAA',
  'NTLH',
  'ARC',
  'NVT',
]);

export const EN_TRANSLATIONS: ReadonlySet<string> = new Set([
  'WEB',
  'KJV',
  'ESV',
  'NIV',
  'NKJV',
  'NASB',
  'NLT',
  'MSG',
]);

const PT_MARKER_WORDS = new Set([
  'senhor', 'pastor', 'deus', 'jesus', 'porque', 'para', 'com', 'como',
  'meu', 'minha', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas',
  'nosso', 'nossa', 'nossos', 'nossas', 'pelo', 'pela', 'pelos', 'pelas',
  'dos', 'das', 'aos', 'nas', 'nos', 'não', 'ele', 'ela', 'eles', 'elas',
  'voce', 'você', 'tudo', 'nada', 'mais', 'mas', 'faltara', 'faltará'
]);

interface BibleDataset {
  translation: SupportedTranslation;
  name: string;
  language: 'en' | 'pt';
  books: Record<string, Record<string, Record<string, string>>>;
}

const DATASETS: Record<SupportedTranslation, BibleDataset> = {
  WEB: webData as BibleDataset,
  KJV: kjvData as BibleDataset,
  ALMEIDA: almeidaData as BibleDataset,
  ONBV: onbvData as BibleDataset,
};

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

    if (verse.translation) {
      const upperTrans = verse.translation.toUpperCase().trim();
      if (PT_TRANSLATIONS.has(upperTrans)) return 'pt';
      if (EN_TRANSLATIONS.has(upperTrans)) return 'en';
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

  getDefaultTranslation(referenceOrLanguage: string): SupportedTranslation {
    if (referenceOrLanguage === 'pt' || referenceOrLanguage === 'en') {
      return referenceOrLanguage === 'pt' ? 'ALMEIDA' : 'WEB';
    }
    const norm = this.resolveReference(referenceOrLanguage);
    return norm?.language === 'pt' ? 'ALMEIDA' : 'WEB';
  }

  canonicalizeTranslation(raw?: string | null): SupportedTranslation | null {
    if (!raw || typeof raw !== 'string') return null;
    const clean = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean === 'web' || clean === 'worldenglishbible') return 'WEB';
    if (clean === 'kjv' || clean === 'kingjames' || clean === 'kingjamesversion') return 'KJV';
    if (clean === 'almeida' || clean === 'jfa' || clean === 'almeidarevista' || clean === 'joaoferreiradealmeida') return 'ALMEIDA';
    if (clean === 'onbv' || clean === 'nbv' || clean === 'novabibliaviva') return 'ONBV';
    return null;
  }

  isBundledTranslation(raw?: string | null): boolean {
    return this.canonicalizeTranslation(raw) !== null;
  }

  isPortugueseTranslation(raw?: string | null): boolean {
    if (!raw) return false;
    const canon = this.canonicalizeTranslation(raw);
    if (canon) return canon === 'ALMEIDA' || canon === 'ONBV';
    return PT_TRANSLATIONS.has(raw.trim().toUpperCase());
  }

  fetchPassageText(
    bookId: string,
    chapter: number,
    startVerse: number,
    endVerse?: number,
    translation: string = 'WEB'
  ): string | null {
    const cleanTrans = this.canonicalizeTranslation(translation) ?? (translation.trim().toUpperCase() as SupportedTranslation);
    const dataset = DATASETS[cleanTrans];
    if (!dataset) return null;

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
