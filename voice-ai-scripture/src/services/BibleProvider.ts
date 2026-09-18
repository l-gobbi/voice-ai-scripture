import { normalizeReference, NormalizedReference } from './ReferenceNormalizer';
import webData from '../data/bibles/web.json';
import kjvData from '../data/bibles/kjv.json';
import almeidaData from '../data/bibles/almeida.json';
import onbvData from '../data/bibles/onbv.json';

export type SupportedTranslation = 'WEB' | 'KJV' | 'ALMEIDA' | 'ONBV';

export interface BiblePassage {
  reference: string;
  text: string;
  translation: SupportedTranslation | string;
  language: 'en' | 'pt';
}

export interface BibleProvider {
  fetchPassage(reference: string, translation: SupportedTranslation | string): Promise<BiblePassage | null>;
}

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

function canonicalizeTranslation(raw: string): SupportedTranslation | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  const clean = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean === 'web' || clean === 'worldenglishbible') {
    return 'WEB';
  }
  if (clean === 'kjv' || clean === 'kingjames' || clean === 'kingjamesversion') {
    return 'KJV';
  }
  if (clean === 'almeida' || clean === 'jfa' || clean === 'almeidarevista' || clean === 'joaoferreiradealmeida') {
    return 'ALMEIDA';
  }
  if (clean === 'onbv' || clean === 'nbv' || clean === 'novabibliaviva') {
    return 'ONBV';
  }
  return null;
}

export class LocalBibleProvider implements BibleProvider {
  async fetchPassage(reference: string, translation: SupportedTranslation | string): Promise<BiblePassage | null> {
    const normalized: NormalizedReference | null = normalizeReference(reference);
    if (!normalized) {
      return null;
    }

    const canonTrans = canonicalizeTranslation(translation);
    if (!canonTrans) {
      return null;
    }

    const dataset = DATASETS[canonTrans];
    if (!dataset || !dataset.books) {
      return null;
    }

    const book = dataset.books[normalized.bookId];
    if (!book) {
      return null;
    }

    const chapter = book[String(normalized.chapter)];
    if (!chapter) {
      return null;
    }

    const startVerse = normalized.startVerse;
    const endVerse = normalized.endVerse ?? startVerse;

    const verseTexts: string[] = [];
    for (let v = startVerse; v <= endVerse; v++) {
      const text = chapter[String(v)];
      if (!text) {
        return null;
      }
      verseTexts.push(text.trim());
    }

    return {
      reference: normalized.canonicalRef,
      text: verseTexts.join(' '),
      translation: canonTrans,
      language: dataset.language,
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

export const bibleProvider = createDefaultBibleProvider();
