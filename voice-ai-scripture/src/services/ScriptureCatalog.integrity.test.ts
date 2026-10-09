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
};

const MARKER = /[{}[\]]/;

/**
 * Psalm titles (superscriptions) are not verse text: learners recite only the verse (Ticket 85).
 * eBible's verse-per-line export merges each title into verse 1, and the build cuts it off
 * using the USFM `\d` title. A Psalm verse 1 that starts like a title means one slipped through.
 *
 * The openings below cover every title the bundled sources use, plus common ones from other
 * Bibles, matched as whole words at the very start of verse 1, ignoring case.
 */
const PSALM_TITLE_OPENINGS: Record<'pt' | 'en', readonly string[]> = {
  pt: [
    'Salmo', 'Salmos', 'Cântico', 'Canção', 'Um cântico', 'Uma canção', 'Hino', 'Poema',
    'Oração de', 'Oração do', 'Instrução', 'Memorial de', 'Confissão de', 'Mictão', 'Masquil',
    'Para o regente', 'Para o mestre de', 'Ao mestre de canto', 'Ao regente', 'Para o cantor-mor',
    'Ao músico-mor', 'Para Salomão', 'De Salomão', 'De Davi', 'De Asafe', 'Dos filhos de Corá',
  ],
  en: [
    'A Psalm', 'A Psalms', 'Psalm of', 'For the choirmaster', 'To the choirmaster',
    'For the director', 'To the chief Musician', 'For the leader', 'A song', 'A Maskil',
    'A Miktam', 'A Michtam', 'A Shiggaion', 'A prayer of', 'Of David', 'Of Solomon', 'Of Asaph',
    'Of the sons of Korah', 'Of Moses', 'A Davidic',
  ],
};

const titleOpening = (language: 'pt' | 'en') =>
  new RegExp(
    `^(?:${PSALM_TITLE_OPENINGS[language].map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'i'
  );

/**
 * Psalm verse 1s that legitimately start like a title, as "PSA chapter:1". None today. The list
 * must match exactly, like VERSIFICATION_EXCEPTIONS.
 */
const PSALM_TITLE_EXCEPTIONS: Record<SupportedTranslation, readonly string[]> = {
  BLIVRE: [],
  ONBV: [],
  BSB: [],
  WEB: [],
};

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

describe('Bundled Bible dataset integrity (Tickets 80 and 81)', () => {
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

describe('Psalm titles are not verse text (Ticket 85)', () => {
  it('has a Psalm title exception list for every bundled translation', () => {
    expect(Object.keys(PSALM_TITLE_EXCEPTIONS).sort()).toEqual([...BUNDLED_TRANSLATIONS].sort());
  });

  it('recognises the titles the eBible verse-per-line sources merged into verse 1', () => {
    expect(titleOpening('pt').test('Salmo de Davi: O SENHOR é meu pastor, nada me faltará.')).toBe(true);
    expect(titleOpening('pt').test('Para o mestre de música. Salmo de Davi. Ó Deus, tenha misericórdia')).toBe(true);
    expect(titleOpening('pt').test('Cântico dos degraus: Em minha angústia clamei ao SENHOR')).toBe(true);
    expect(titleOpening('en').test('A Psalm of David. The LORD is my shepherd; I shall not want.')).toBe(true);
    expect(titleOpening('en').test('For the choirmaster. A Psalm of David. Have mercy on me, O God')).toBe(true);
    expect(titleOpening('en').test('Of David. The LORD is my light and my salvation')).toBe(true);

    expect(titleOpening('pt').test('O SENHOR é meu pastor, nada me faltará.')).toBe(false);
    expect(titleOpening('en').test('The LORD is my shepherd; I shall not want.')).toBe(false);
  });

  it.each([...BUNDLED_TRANSLATIONS])(
    '%s: no Psalm verse 1 starts with a title, except the documented ones',
    (code) => {
      const language = scriptureCatalog.getTranslationMetadata(code)!.language as 'pt' | 'en';
      const opening = titleOpening(language);
      const titled: string[] = [];
      for (let chapter = 1; chapter <= 150; chapter++) {
        const verse1 = scriptureCatalog.fetchPassageText('PSA', chapter, 1, undefined, code);
        expect(verse1).toBeTruthy();
        if (opening.test(verse1!)) titled.push(`PSA ${chapter}:1`);
      }
      expect(titled).toEqual(PSALM_TITLE_EXCEPTIONS[code]);
    }
  );

  it('Psalm 23:1 starts with the verse words in Bíblia Livre, ONBV and BSB', () => {
    expect(scriptureCatalog.resolvePassage('Salmos 23:1', 'BLIVRE')?.text).toBe(
      'O SENHOR é meu pastor, nada me faltará.'
    );
    expect(scriptureCatalog.resolvePassage('Salmos 23:1', 'ONBV')?.text).toBe(
      'O Senhor é o meu pastor. Ele me dá tudo de que preciso!'
    );
    expect(scriptureCatalog.resolvePassage('Psalm 23:1', 'BSB')?.text).toBe(
      'The LORD is my shepherd; I shall not want.'
    );
  });
});
