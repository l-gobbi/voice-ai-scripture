import {
  scriptureCatalog,
  BUNDLED_TRANSLATIONS,
  SupportedTranslation,
} from './ScriptureCatalog';

/**
 * Dataset integrity for every bundled Bible (Ticket 80, spec-open-translations.md).
 *
 * Each translation is read through the Scripture Catalog exactly as the app reads it, and
 * compared with the canon matrix (src/data/bibleCanon.ts, ADR 0008). A rebuilt dataset that
 * loses a book, chapter or verse, gains one, or carries `{…}`/`[…]` markers fails here.
 *
 * VERSIFICATION_EXCEPTIONS lists every place where a dataset legitimately differs from the
 * canon matrix. The list must match exactly: a new gap fails, and so does a stale exception.
 * Format: "BOOK chapter:verse missing" (the canon has the verse, the dataset does not) or
 * "BOOK chapter:verse extra" (the dataset has a verse beyond the canon's count).
 */
const VERSIFICATION_EXCEPTIONS: Record<SupportedTranslation, readonly string[]> = {
  // Bíblia Livre follows the canon matrix verse for verse.
  BLIVRE: [],

  // The ONBV numbers the closing clause of these chapters as a verse of its own (as Hebrew-
  // tradition Portuguese Bibles do): "a terra ficou em paz durante quarenta anos" (Jdg 5:32),
  // "Assim eles se separaram…" (1 Sm 20:43), "A paz esteja com você…" (3 Jo 15).
  // No text is missing; the canon's last verse is split in two.
  ONBV: ['JDG 5:32 extra', '1SA 20:43 extra', '3JN 1:15 extra'],

  // The BSB follows the critical Greek text and leaves these verses out of the text (it gives
  // them in footnotes, which eBible's verse-per-line export drops).
  BSB: [
    'MAT 17:21 missing',
    'MAT 18:11 missing',
    'MAT 23:14 missing',
    'MRK 7:16 missing',
    'MRK 9:44 missing',
    'MRK 9:46 missing',
    'MRK 11:26 missing',
    'MRK 15:28 missing',
    'LUK 17:36 missing',
    'LUK 23:17 missing',
    'JHN 5:4 missing',
    'ACT 8:37 missing',
    'ACT 15:34 missing',
    'ACT 24:7 missing',
    'ACT 28:29 missing',
    'ROM 16:24 missing',
  ],

  // The WEB leaves out four verses absent from its Greek text, and places the closing
  // doxology of Romans at 14:24-26 (Majority Text order) instead of 16:25-27.
  WEB: [
    'LUK 17:36 missing',
    'ACT 8:37 missing',
    'ACT 15:34 missing',
    'ACT 24:7 missing',
    'ROM 14:24 extra',
    'ROM 14:25 extra',
    'ROM 14:26 extra',
    'ROM 16:25 missing',
    'ROM 16:26 missing',
    'ROM 16:27 missing',
  ],

  // ALMEIDA and KJV are deleted in ticket 81. These entries are NOT legitimate differences of
  // the translations themselves: they are defects of the thiagobodruk/bible source dataset,
  // listed only so the test stays strict for every other text until then.
  // ALMEIDA: Hebrew-style splits (the "extra" verses) and final verses merged into the
  // previous one, which shifts the chapter (the "missing" verses).
  ALMEIDA: [
    'JDG 5:32 extra',
    '1SA 20:43 extra',
    '1KI 22:54 extra',
    'MAT 2:23 missing',
    'MAT 27:66 missing',
    'LUK 22:71 missing',
    '3JN 1:15 extra',
    'REV 12:18 extra',
  ],
  // KJV: the same kind of source defects (e.g. Matthew 2:23 is merged into 2:22), although
  // the King James Version itself numbers these chapters as the canon matrix does.
  KJV: [
    '1SA 20:43 extra',
    '1KI 22:54 extra',
    'MAT 2:23 missing',
    'MAT 22:46 missing',
    'MAT 26:75 missing',
    'MRK 4:41 missing',
    'MRK 7:37 missing',
    'MRK 8:38 missing',
    '3JN 1:15 extra',
    'REV 12:18 extra',
  ],
};

/**
 * ALMEIDA and KJV are removed from the bundle in ticket 81 (ADR 0018). Their source dataset
 * keeps `{…}` markers (about 17,000 KJV verses), so they are exempt from the marker check
 * until they are deleted. Every other bundled Bible must be marker-free.
 */
const MARKER_CHECK_EXEMPT: ReadonlySet<SupportedTranslation> = new Set(['ALMEIDA', 'KJV']);

const MARKER = /[{}[\]]/;

interface DatasetScan {
  booksWithText: number;
  gaps: string[];
  markedVerses: string[];
}

function scanDataset(code: SupportedTranslation): DatasetScan {
  const books = scriptureCatalog.getBooks();
  const gaps: string[] = [];
  const markedVerses: string[] = [];
  let booksWithText = 0;

  const text = (bookId: string, chapter: number, verse: number) =>
    scriptureCatalog.fetchPassageText(bookId, chapter, verse, undefined, code);

  for (const book of books) {
    if (text(book.id, 1, 1)) booksWithText++;

    for (let chapter = 1; chapter <= book.chapters; chapter++) {
      const expected = scriptureCatalog.getVerseCount(book.id, chapter);
      for (let verse = 1; verse <= expected; verse++) {
        const verseText = text(book.id, chapter, verse);
        if (!verseText) {
          gaps.push(`${book.id} ${chapter}:${verse} missing`);
        } else if (MARKER.test(verseText)) {
          markedVerses.push(`${book.id} ${chapter}:${verse}`);
        }
      }
      for (let verse = expected + 1; text(book.id, chapter, verse); verse++) {
        gaps.push(`${book.id} ${chapter}:${verse} extra`);
        if (MARKER.test(text(book.id, chapter, verse)!)) {
          markedVerses.push(`${book.id} ${chapter}:${verse}`);
        }
      }
    }

    if (text(book.id, book.chapters + 1, 1)) {
      gaps.push(`${book.id} ${book.chapters + 1} extra chapter`);
    }
  }

  return { booksWithText, gaps, markedVerses };
}

describe('Bundled Bible dataset integrity (Ticket 80)', () => {
  it('has an exception list for every bundled translation', () => {
    expect(Object.keys(VERSIFICATION_EXCEPTIONS).sort()).toEqual([...BUNDLED_TRANSLATIONS].sort());
  });

  describe.each([...BUNDLED_TRANSLATIONS])('%s', (code) => {
    let scan: DatasetScan;

    beforeAll(() => {
      scan = scanDataset(code);
    });

    it('contains all 66 books of the canon', () => {
      expect(scriptureCatalog.getBooks()).toHaveLength(66);
      expect(scan.booksWithText).toBe(66);
    });

    it('matches the canon matrix chapter and verse counts, except the documented differences', () => {
      expect(scan.gaps).toEqual(VERSIFICATION_EXCEPTIONS[code]);
    });

    it('has no { } [ ] markers in any verse', () => {
      if (MARKER_CHECK_EXEMPT.has(code)) return;
      expect(scan.markedVerses.slice(0, 20)).toEqual([]);
      expect(scan.markedVerses).toHaveLength(0);
    });

    it('carries non-empty name, language, licence, notice and source metadata', () => {
      const meta = scriptureCatalog.getTranslationMetadata(code);
      expect(meta).not.toBeNull();
      expect(meta!.code).toBe(code);
      expect(['en', 'pt']).toContain(meta!.language);
      for (const field of ['name', 'fullName', 'license', 'notice', 'sourceUrl'] as const) {
        expect(meta![field].trim()).not.toBe('');
      }
    });
  });
});
