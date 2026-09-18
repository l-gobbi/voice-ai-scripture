import { normalizeReference, NormalizedReference } from './ReferenceNormalizer';
import webData from '../data/bibles/web.json';
import kjvData from '../data/bibles/kjv.json';
import almeidaData from '../data/bibles/almeida.json';
import onbvData from '../data/bibles/onbv.json';

export interface BiblePassage {
  reference: string;
  text: string;
  translation: string;
  language: 'en' | 'pt';
}

export interface BibleProvider {
  fetchPassage(reference: string, translation: string): Promise<BiblePassage | null>;
}

interface BibleDataset {
  translation: string;
  name: string;
  language: 'en' | 'pt';
  books: Record<string, Record<string, Record<string, string>>>;
}

const DATASETS: Record<string, BibleDataset> = {
  WEB: webData as BibleDataset,
  KJV: kjvData as BibleDataset,
  ALMEIDA: almeidaData as BibleDataset,
  ONBV: onbvData as BibleDataset,
};

function canonicalizeTranslation(raw: string): string | null {
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
  async fetchPassage(reference: string, translation: string): Promise<BiblePassage | null> {
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

    if (normalized.endVerse === undefined) {
      const verseText = chapter[String(normalized.startVerse)];
      if (!verseText) {
        return null;
      }
      return {
        reference: normalized.canonicalRef,
        text: verseText.trim(),
        translation: canonTrans,
        language: normalized.language,
      };
    }

    const verseTexts: string[] = [];
    for (let v = normalized.startVerse; v <= normalized.endVerse; v++) {
      const text = chapter[String(v)];
      if (text) {
        verseTexts.push(text.trim());
      }
    }

    if (verseTexts.length === 0) {
      return null;
    }

    return {
      reference: normalized.canonicalRef,
      text: verseTexts.join(' '),
      translation: canonTrans,
      language: normalized.language,
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
